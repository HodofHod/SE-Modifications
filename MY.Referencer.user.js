// ==UserScript==
// @name         Mi Yodeya Referencer
// @description  Links Tanach, Talmud, and Mishna Torah references to online resources.
// @match        http://stackoverflow.com/*
// @match        http://meta.stackoverflow.com/*
// @match        http://superuser.com/*
// @match        http://meta.superuser.com/*
// @match        http://serverfault.com/*
// @match        http://meta.serverfault.com/*
// @match        http://askubuntu.com/*
// @match        http://meta.askubuntu.com/*
// @match        http://answers.onstartups.com/*
// @match        http://meta.answers.onstartups.com/*
// @match        http://stackapps.com/*
// @match        http://*.stackexchange.com/*
// @exclude      http://api.*.stackexchange.com/*
// @exclude      http://data.stackexchange.com/*
// @exclude      http://*/reputation
// @author       HodofHod
// @namespace    HodofHod
// @version      4.1.1
// ==/UserScript==


/*
Credits:
@TimStone for the inject() function and some stray bits
@Menachem for the Chabad.org and Mechon Mamre links, and for all the debugging help
@CharlesKoppelman for the code restructure and debugging
Joel Nothman and bibref.hebtools.com's spellings, which I pruned and modded
The Mi Yodeya community for their help with Rambam's topic name spellings

ABANDON ALL HOPE, YE WHO LIKE WELL-WRITTEN CODE. y'know. with standards 'n stuff. (
Are there even standards for JavaScript? Oh well.)

Quick map:
inject() injects the code into the page

reference() is called for each textarea's events, and calls link() each time a prefix matches. If
	link returns a value, we replace the text.  At the end, replaces the contents of each textarea.

link() calls search() to find the canonicalName, then calls linker.link() to generate the url and
	optionally calls linker.displayName() to generate the displayText.  Returns the replacement string.

register(prefix, linker) should be called to register each linker with a prefix.  A linker is expected to have:
	{
		regex: /^.*$/i,                             // a regular expression to match on

		spellings: ["canonicalName:spelling1, sp2"],// An array of strings. See @HodofHod for more info

		searchType: {                               // human-readable text to fill in here:
			book : "string",                        //      "we couldn't figure out which " + {{book}} + " you were trying to link to.
			partPlural : "strings"                  //      "... seemed ambiguous to our system, and could have referred to multiple " + {{partPlural}} + ".
		},
		nameOverrides: {                            // an optional property to override
			"canonicalName" : "userPreferredName"   // specific canonical names in `l`-flagged links
		}
		displayName: function (name, match, isUntouched),
													// a function which returns human-readable text
													// to represent the source. name is the name of the work,
													// match is the regex results, and isUntouched is if the "u" flag was used
													// must return valid value if link() is valid

		link: function (actualName, match, options) // a function which returns a url
													// given the canonical name, regex results, and flags
													// (or any falsy value if invalid)
	}

search() does the searching, regex style. Pretty powerful, and will match things pretty broadly.

the various linker.link functions manage tanach, gemara, and mishneh torah
references, respectively. They generally call the below functions to generate the URL.

chabadT(), chabadMT(), mechonMamreT(), mechonMamre() are private helper functions 
that generate the URLs, and pass them back to their linking functions. 
gemara does its URLs in-house for now.

*/

function inject() { //Inject the script into the document
	var script;
	for (var i = 0; i < arguments.length; i++) {
		if (typeof (arguments[i]) === 'function') {
			script = document.createElement('script');
			script.type = 'text/javascript';
			script.textContent = '(' + arguments[i].toString() + ')(jQuery)';
			document.body.appendChild(script);
		}
	}
}

inject(function ($) {
	var registrations = [],
		prefixes = [],
		d = [];
	
	function register(prefix, linker) {
		var cleanPrefix = prefix.replace(/[\\\^$*+?.\(\)|\[\]]/g, "\\$&");
		registrations[cleanPrefix] = linker;
		prefixes.push(cleanPrefix);
	}
	
	function reference(t) {//takes a string. returns array, [match_object, true/false, replacement/error]
		var match,
			matches = [],
			regex = new RegExp("(^|[^`])(\\[\\s*(" + prefixes.join("|") + ")[;,. :-]" +
							   "([^\\]\\[]+?)" +
							   "(?:[\\.\\s:]+([a-z]{0,4}))?\\s*\\])", "mig");//More permissive before flags in prep for ranges
		$.each(t.split('\n'), function (i, line){
			while (line.indexOf('    ') !== 0 && (match = regex.exec(line)) !== null) {
				if (!d[match]) {
					d[match] = link(registrations[match[3]], match[4], match[5]);
				}
				matches.push([match].concat(d[match]));
			}
		});
		return matches;
	}

	function link(linker, value, options) {
		var match = linker.regex.exec(value),
			searchResult = null,
			displayText = null,
			CAPTURE_INDEX_OF_NAME = 1,
			url;
		options = (options || '').toLowerCase();
		if (!match) return [false, 'Bad syntax'];
		
		//some books, like kitzur, aren't referenced by section name, so no spelling search needed.
		if (linker.spellings){
			searchResult = search(match[CAPTURE_INDEX_OF_NAME], linker.spellings, linker.searchType);
			if (!searchResult[0] && searchResult[1].search(/ambiguous/) !== -1){
				match = !!linker.regex2 && linker.regex2.exec(value);
				(match) && (searchResult = search(match[CAPTURE_INDEX_OF_NAME], linker.spellings, linker.searchType));
			}
			if (!searchResult[0]) return searchResult;
	
			url = linker.link(searchResult[1], match, options);//returns either url, or [false, error_message]
		} else {
			searchResult = ['', '']; //No search result for kitzur-like books. TODO: Bypass using searchResult at all for these books, to make code less confusing.
			url = linker.link(match, options);//returns either url, or [false, error_message]
		}
		
		if (url[0]) {
			url = [true, url];
			var addLink = options.indexOf("l") !== -1,
				untouched = options.indexOf("u") !== -1;

			if (untouched || addLink) {
				if (untouched) { // u means use the name the user passed in
					displayText = linker.displayName(match[CAPTURE_INDEX_OF_NAME], match, true);
					//displayText = value; Starting to work on ranges...
				} else { // l always means add link with text
					var fixedName = searchResult[1]; 
					if(linker.nameOverrides !== undefined) {
						fixedName = linker.nameOverrides[searchResult[1]] || searchResult[1];
					}
					displayText = linker.displayName(fixedName, match, false);
				}
				return [true, "[" + displayText + "](" + url[1] + ")"];
			}
		}
		return url;//either [true, url] or [false, error-text]
	}
  
	function search(title, spellings, searchInfo, redo) {
		var counter, //keep track of how many titles the word matches
			titles_found = [], //keep track of which titles.
			word,
			found = false,
			san = title.toLowerCase().replace(/['._*]/g, '');
			title_words = (san.match(/[0-9]/g) || []).concat(san.match(/[a-zA-Z]+/g));
		redo = redo === undefined ? 0 : redo; //if redo isn't passed, default to 0.
		for (var wordi = 0; wordi < title_words.length; wordi++) { //iterate through each word in input
			word = title_words[wordi];
			counter = 0; //reset the counter for each word
			switch (redo) {
			case 0://first time through, whole word match only.
				word = '[,:]' + word + '(,|$)';
				break;
			case 1://nothing found last time...
				word = '[,:]' + word; //this time, allow partial word matches.
				break;
			case 2://anywhere in the word match.
				word = word;//Yes, I know this is redundant
				break;
			case 3://strip out prefixes before trying again
				word = '[,:]' + word.replace(/^(ve|v|u|ha|u)/, '');
				break;
			case 4:
				break; 
			}
			if (['1', '2', 'i', 'ii'].indexOf(title_words[wordi]) !== -1) {//special case for multi-volumes
				word = '[,:]' + title_words[wordi] + '(,|$)'; 
			} 
			word = new RegExp(word);//turn word into a regex for searching
			
			if (redo == 4 || titles_found.length === 0) { //if we haven't found any matches yet from previous words
				for (var syni = 0; syni < spellings.length; syni++) { //iterate through different titles
					if (word.test(spellings[syni])) { //check if the word is in the synonyms
						counter++;
						titles_found.push(syni); //add the title's index to the list of titles matched
					}
				}
			} else { //we've already matched some titles from previous words
				for (var topi = 0; topi < titles_found.length; topi++) { //only iterate through already matched titles
					syni = titles_found[topi];
					if (word.test(spellings[syni])) {
						counter++;
					}else{
						titles_found.splice(titles_found.indexOf(syni), 1) && topi--;
					}
				}
			}
			if (titles_found.length === 1) { //only one title matched/left, so we know we've got the right one
				return [true].concat(spellings[titles_found[0]].match(/^.+(?=:)/));
			}
		}

		if (!found) { //No match :( (Redundant condition; if anything has been found we already returned, it's only here for readability. So for you, basically. So you better appreciate it.)
			var t = searchInfo.book,
				p = searchInfo.partPlural;
			if (redo < 3) { //no matches, but we haven't retried with out prefixes and partial matches.
				return search(title, spellings, searchInfo, redo + 1); //then we'll try
			} else if (redo == 3){
				var all = [];
				$.each(title_words, function(i, word){
					all.push(word);
					while (word.length > 3){
						all.push(word = word.slice(0,-1));
					}
				});
				titles_found = search(all.join(' '), spellings, searchInfo, 4);
				if (titles_found[0] === true){
					return titles_found; //search returned unambiguously.
				}else{
					var title_string = titles_found.join(','),
						max = [0, false];
					$.each(titles_found, function(i, title){
						occurrences = title_string.match(RegExp(title, "g")).length;
						if (occurrences > max[0]) max = [occurrences, title];
						if (occurrences == max[0]) max = [occurrences, false];
					});
					if (max[1]) return [true, spellings[max[1]].match(/^.+(?=:)/)];
				}
			}else if (redo == 4){
				return titles_found;
			}
			if (titles_found.length > 1) {//ambiguous. multiple matches found, no point in retrying
				var titles = '';
				titles_found.map(function (t) { titles += spellings[t].slice(0, spellings[t].indexOf(':')) + '\n'; });
				return [false, "We're sorry; we couldn't figure out which " + t + " you were trying to link to. The text you entered, (" + '"' + title + '"' + ") seemed ambiguous to our system, and could have referred to multiple " + p + ". Try to refine your entry by making it more specific. \n\nIf you'd like, you can ping @HodofHod in this chat room and he'll look into it: \nhttp://chat.stackexchange.com/rooms/9434" + "\n\n" + p + ' matched:\n' + titles];
			}else{//no matches found at all.
				return [false, "We're sorry; we couldn't figure out which " + t + " you were trying to link to. The text you entered, (" + '"' + title + '"'  + ") was not recognized by our system. This might be because you're using a spelling or an abbreviation that isn't in our system yet. \n\nIf you'd like to add this spelling, you can ping @HodofHod in this chat room and he'll look into it: \nhttp://chat.stackexchange.com/rooms/9434"];
			}
		}
	}
  
	(function () {
		register("t", (function () {
			var mechonMamreT = function (book, chpt, vrs, map) {
				var url = null;
				if (chpt < 10) { chpt = '0' + chpt; } //Mechon Mamre likes all their chapter ids to be two digits, and everyone else can go fayfn.

				//mechon mamre (zol zayn gezunt un shtark) has an annoying way of shortening 3-digit chapter
				//numbers into 2 digit string+number combos. I.e., 100 = a0, 101 = a1, 110 = b0, etc.,
				//So! Take a 3-digit number as a string, and convert the first (or first two) characters to an int,
				//then convert that into a hexadecimal letter, then prepend that to
				//the third character of the 3-digit number-string, and that becomes the chapter id
				//string to add to the url.
				chpt = parseInt(chpt.slice(0, -1), 10).toString(16) + chpt.slice(-1);
				url = 'http://www.mechon-mamre.org/p/pt/pt' + map[book][2] + chpt + '.htm';
				if (vrs) { url += '#' + vrs; } //if verse is specified in the reference
				return url;
			},

				chabadT = function (book, chpt, vrs, flags, map) {
					var cid = null,
						url = null;
					chpt = parseInt(chpt, 10);
					cid = map[book][0] + chpt - 1;
					if ([8171, 8170].indexOf(cid) !== -1) { cid = (cid === 8170 ? 8171 : 8170); } //Bereishis' chapters are not all sequential
					if (cid >= 8177 && cid <= 8245) { cid += 31; } //These two lines adjust for that
					url = 'http://www.chabad.org/library/bible_cdo/aid/' + cid;
					if (flags.indexOf('r') !== -1) { url += "#showrashi=true"; } //Rashi flag is set?
					if (vrs) { //Verse is specified?
						url += (flags.indexOf('r') !== -1) ? '&v=' + vrs : '#v=' + vrs;//rashi is _also_ specified?
					}
					return url; //Then we're ready to rummmmmmbbblleee.....
				},
                sefariaT = function (book, chpt, vrs, map) {
                    var url = 'http://www.sefaria.org/' + map[book][3] + "." + chpt;
                    if (vrs) { url += '.' + vrs; } //if verse is specified in the reference
                    return url;
                };

			return {
				regex : /^([12]?[a-zA-Z'".*_ ]{2,}?\.?[12]?)[;.,\s:]+(\d{1,3})(?:[;.,\s:\-]+(\d{1,3})(?:-(\d{1,3}))?)?$/i,
				regex2: /^([a-zA-Z'".*_ ]{2,}[12]?)[;.,\s:]+(\d{1,3})(?:[;.,\s:\-]+(\d{1,3})(?:-(\d{1,3}))?)?$/i,
				link: function (book, match, flags) {
					//Keys are book names (duh) first value is chapter 1's id for chabad.org. 2nd value is number of chapters
					//Third value is Mechon Mamre's book id
					var map = {
                        'Bereishit': [8165, 50, '01', 'Genesis'], 'Shemot': [9862, 40, '02', 'Exodus'],'Vayikra': [9902, 27, '03', 'Leviticus'],
                        'Bamidbar': [9929, 36, '04', 'Numbers'],'Devarim': [9965, 34, '05', 'Deuteronomy'],'Yehoshua': [15785, 24, '06', 'Joshua'],
                        'Shoftim': [15809, 21, '07', 'Judges'],'Shmuel I': [15830, 31, '08a', 'I_Samuel'],'Shmuel II': [15861, 24, '08b', 'II_Samuel'],
                        'Melachim I': [15885, 22, '09a', 'I_Kings'],'Melachim II': [15907, 25, '09b','II_Kings'],'Yeshayahu': [15932, 66, '10', 'Isaiah'],
                        'Yirmiyahu': [15998, 52, '11', 'Jeremiah'],'Yechezkel': [16099, 48, '12', 'Ezekiel'],'Hoshea': [16155, 14, '13', 'Hosea'],
                        'Yoel': [16169, 4, '14', 'Joel'],'Amos': [16173, 9, '15', 'Amos'],'Ovadiah': [16182, 1, '16', 'Obadiah'],
                        'Yonah': [16183, 4, '17', 'Jonah'],'Michah': [16187, 7, '18', 'Micah'],'Nachum': [16194, 3, '19', 'Nahum'],
                        'Chavakuk': [16197, 3, '20', 'Habakkuk'],'Tzefaniah': [16200, 3, '21', 'Zephaniah'],'Chaggai': [16203, 2, '22', 'Haggai'],
                        'Zechariah': [16205, 14, '23', 'Zechariah'],'Malachi': [16219, 3, '24', 'Malachi'],
                        'Divrei Hayamim I': [16521, 29, '25a', 'I_Chronicles'],'Divrei Hayamim II': [16550, 36, '25b', 'II_Chronicles'],
                        'Tehillim': [16222, 150, '26', 'Psalms'],'Iyov': [16403, 42, '27', 'Job'],'Mishlei': [16372, 31, '28', 'Proverbs'],
                        'Rus': [16453, 4, '29', 'Ruth'],'Shir HaShirim': [16445, 8, '30', 'Song_of_Songs'],'Kohelet': [16462, 12, '31', 'Ecclesiastes'],
                        'Eichah': [16457, 5, '32', 'Lamentations'],'Esther': [16474, 10, '33', 'Esther'],
                        'Daniel': [16484, 12, '34', 'Daniel'],'Ezra': [16498, 10, '35a', 'Ezra'],'Nechemiah': [16508, 13, '35b', 'Nehemiah']
					},
						chpt = match[2],
						vrs = match[3] || '',
						rangeVrs = match[4];

					flags = flags.toLowerCase(); //more matching purposes
					if (chpt === '0') { //If the chapter number is 0, then someone's trying to cheat me!
						return [false, '"0" is not a valid chapter number. Please try again.'];
					}

					if (chpt > map[book][1]) { //Stop trying to sneak fake chapters in, aright?
						return [false,'"' + chpt + '" is not a valid chapter for ' + book + '. \n\nThere are only ' + map[book][1] + ' chapters in ' + book + '\n\nPlease try again.'];
					}
                    //Mechon Mamre flag is set?
                    if (flags.indexOf('m') !== -1){
                        return  mechonMamreT(book, chpt, vrs, map);
                    //Efshar Sefaria?
                    }else if ( flags.indexOf('s') !== -1){
                        return sefariaT(book, chpt, vrs, map);
                    }else{
                        return chabadT(book, chpt, vrs, flags, map); //Default to Chabad.org
                    }
				},
				//nameOverrides: {"Esther" : "Ester" },
				spellings: [
					'Bereishit:beraishis,beraishit,berayshis,bereishis,bereishit,bereshit,braishis,braishit,brayshis,brayshit,breishis,breishit,ge,genesis,geneza,gn', 
					'Shemot:ex,exd,exod,exodus,sh,shemos,shemot,shmos,shmot', 'Vayikra:lb,le,leu,leviticus,lv,vayikra,vayiqra,vayyikra,vayyiqra', 
					'Bamidbar:bamidbar,bmidbar,br,nb,nm,nomb,nu,numbers', 'Devarim:de,deut,deuteronomio,deuteronomium,deuteronomy,devarim,dvarim,dt', 
					'Yehoshua:ios,josh,joshua,josua,joz,jsh,yehoshua,yoshua', 'Shoftim:jdgs,jg,jt,judg,judges,jue,juges,shofetim,shoftim', 
					'Shmuel I:1,firstsamuel,i,isam,isamuel,s,sa,samuel,samueli,shmuel,shmuela,shmueli,sm', 'Shmuel II:2,ii,iisam,iisamuel,s,sa,samuel,samuelii,secondsamuel,shmuel,shmuelb,shmuelii,sm', 
					'Melachim I:1,firstkgs,firstkings,i,ikgs,ikings,k,kg,ki,kings,kingsi,melachim,melachimi,mlachima,stkings', 
					'Melachim II:2,ii,iikgs,iikings,k,kg,ki,kings,kingsii,melachim,melachimii,mlachimb,ndkings,secondkgs,secondkings', 
					'Yeshayahu:is,isa,isaiah,isiah,yeshayah,yeshayahu', 'Yirmiyahu:je,jeremia,jeremiah,jeremija,jr,yeremiyah,yeremiyahu,yirmiyahu', 
					'Yechezkel:,ez,ezec,ezekial,ezekiel,hes,yecheskel,yechezkel', 'Hoshea:ho,hosea,hoshea', 'Yoel:ioel,jl,joel,jol,yoel', 
					'Amos:am,amos,ams', 'Ovadiah:ab,abdija,ob,obad,obadiah,obadija,obadja,obd,ovadiah,ovadyah', 'Yonah:ion,jna,jnh,jona,jonah,yonah', 
					'Michah:mch,mi,micah,micha,michah,miha,miq', 'Nachum:na,nachum,naham,nahum,nam', 
					'Chavakuk:chavakuk,ha,habacuc,habakkuk,habakuk,habaqquq,habaquq', 
					'Tzefaniah:sefanja,sofonija,soph,tsefania,tsephania,tzefaniah,tzephaniah,zefanija,zefanja,zeph,zephanja,zp', 
					'Chaggai:chagai,chaggai,hagai,haggai,haggay,hg,hgg', 'Zechariah:sacharja,za,zach,zacharia,zaharija,zc,zch,zech,zechariah,zecharya,zekhariah',
					'Malachi:malachi,malahija,malakhi,maleachi,ml', 
					'Divrei Hayamim I:1,ch,chron,chroniclesi,cr,dh,divreihayamim,divreihayamimi,firstchronicles,i,ichr,ichronicles', 
					'Divrei Hayamim II:2,ch,chron,chroniclesii,cr,dh,divreihayamim,divreihayamimii,ii,iichr,iichronicles,secondchronicles', 
					'Tehillim:ps,psalm,psalmen,psalmi,psalms,psg,pslm,psm,pss,salmos,sl,tehilim,tehillim,thilim,thillim', 
					'Iyov:hi,hiob,ijob,iyov,iyyov,jb', 'Mishlei:mishlei,mishley,pr,prou,proverbs,prv', 
					'Rus:rt,rth,ru,rus,ruta,ruth', 'Shir HaShirim:sgs,shirhashirim,sng,so,song,songofsolomon,songofsongs,sos,ss,canticles', 
					'Kohelet:ec,eccl,ecclesiastes,ecl,koheles,kohelet,qo,qohelet,qoheleth,qohleth', 'Eichah:aichah,eichah,eikhah,la,lamentaciones,lamentations,lm',
					'Esther:ester,estera,esther', 'Daniel:da,daniel,dn', 'Ezra:esra,ezra', 
					'Nechemiah:ne,nechemiah,nehemia,nehemiah,nehemija,nehemyah,nchemyah,nchemia,nhemiah'
				],
				searchType: { book: "book of Tanakh", partPlural: "books" },
				displayName: function (name, match) {
					var verse = match[3] ? ":" + match[3] : '';
					//var verse = (match[3] ? ":" + match[3] : '') + (match[4] ? '-' + match[4] : ''); Prepping for ranges
					return name + " " + match[2] + verse;
				}
			};
		}()));

		register("g", (function(){
			function evalPage(page) { 
				var res = parseInt(page.split(/[ab]/)[0]) * 2;
				res += (page.substr(-1) == "b")
				return  res;
			}
			function checkValidPage(page, lastPage, firstPage){
				var pageVal = evalPage(page),
					lastPageVal = evalPage(lastPage),
					firstPageVal = evalPage(firstPage || "2a");
				return pageVal >= firstPageVal && pageVal <= lastPageVal;
			}
			return {
				regex: /^([a-zA-Z'" .*_]{2,})[;.,\s:]+(\d{1,3})([ab])(?:-(\d+)?(a|b))?$/i,
				link: function (mes, match, flags) {
					var mesechtos = {
							"Brachos"    :[ 1, "64a" ], "Shabbos"   :[ 2, "157b"], "Eruvin"       :[ 3, "105a"],
							"Pesachim"   :[ 4, "121b"], "Shekalim"  :[ 5, "22b" ], "Yoma"         :[ 6, "88a" ],
							"Succah"     :[ 7, "56b" ], "Beitzah"   :[ 8, "40b" ], "Rosh Hashanah":[ 9, "35b" ],
							"Taanis"     :[10, "31a" ], "Megilah"   :[11, "32a" ], "Moed Katan"   :[12, "29a" ],
							"Chagigah"   :[13, "27a" ], "Yevamos"   :[14, "122b"], "Kesuvos"      :[15, "112b"],
							"Nedarim"    :[16, "91b" ], "Nazir"     :[17, "66b" ], "Sotah"        :[18, "49b" ],
							"Gitin"      :[19, "90b" ], "Kiddushin" :[20, "82b" ], "Bava Kama"    :[21, "119b"],
							"Bava Metzia":[22, "119a"], "Bava Basra":[23, "176b"], "Sanhedrin"    :[24, "113b"],
							"Makkos"     :[25, "24b" ], "Shevuos"   :[26, "49b" ], "Avoda Zarah"  :[27, "76b" ],
							"Horayos"    :[28, "14a" ], "Zevachim"  :[29, "120b"], "Menachos"     :[30, "110a"],
							"Chulin"     :[31, "142a"], "Bechoros"  :[32, "61a" ], "Erchin"       :[33, "34a" ],
							"Temurah"    :[34, "34a" ], "Kerisus"   :[35, "28b" ], "Meilah"       :[36, "37b" ],
							"Nidah"      :[37, "73a" ],
							//[book id, startPage, firstDaf, lastDaf]
							"Tamid": [9661, 56, "28b", "33a"],
							"Kinim": [14304, 477, "22a", "25a"],
							"Midos": [22420, 2, "34a", "37b"],
						},
						page = parseInt(match[2], 10),
						side = match[3].toLowerCase(), //Capitals break HB links.
						rangePage = match[4],//Prepping for ranges; doesn't do anything (yet)
						rangeSide = match[5],// ""	
						mesechta = mesechtos[mes],
						res;
					
					if (["Tamid", "Kinim", "Midos"].indexOf(mes) !== -1){
						var firstPage = mesechta[2],
							lastPage  = mesechta[3];
						//check if page is between firstPage and lastPage
						if (!checkValidPage(page+side, lastPage, firstPage)) {
							return [false, '"' + page + side + '" is not a valid page for Mesechtas ' + mes + 
									'. Page numbers should be between ' + firstPage + ' and ' + lastPage + '. Please try again.'];
						} else {
							var pageIncrement = evalPage(page+side) - evalPage(firstPage);
							res = "http://hebrewbooks.org/pdfpager.aspx?req=";
							res += mesechta[0] + "&pgnum=" + (mesechta[1] + pageIncrement);
						}
					} else {
						if (!checkValidPage(page+side, mesechta[1])) {
							return [false, '"' + page + side + '" is not a valid page for Mesechtas ' + mes + '. Page numbers should be between 2 and ' + mesechta[1] + '. Please try again.'];
						}
						if (side === 'a') side = ''; //hebrewbooks is weird.
						res = 'http://hebrewbooks.org/shas.aspx?mesechta=' + mesechta[0] + '&daf=' + page + side + '&format=';
						res += (flags.indexOf('t') !== -1) ? 'text' : 'pdf';//text version flag is set?
					}
					//special cases
					if (mes == "Gitin" && page == 90 && side == "b"){ res = "http://hebrewbooks.org/pdfpager.aspx?req=37961&pgnum=191"; }
					if (mes == "Midos" && page == 34 && side == "a"){ res = "http://hebrewbooks.org/pdfpager.aspx?req=22420&pgnum=1"; }
					
					return res;
				},
				spellings: ['Brachos:berachos,berachot,brachos,brachot,brcht,brchs', 'Shabbos:shabbos,shabbat,shabbas,shabos,shabat,shbt,shbs', 
							'Eruvin:eruvin,eiruvin,ervn,er', 'Pesachim:pesachim,psachim,pesakhim,psakhim,pes,psa,pschm,ps', 
							'Shekalim:shekalim,shekolim,shkalim,shkolim,shk,shek', 'Yoma:yoma,yuma,ym', 'Succah:succah,sukkah,suka,sukah,sk,sc',
							'Beitzah:beitzah,betzah,betza,btz', 'Rosh Hashanah:rosh,hashana,rsh,rh', 'Taanis:taanis,taanith,tanith,tanis,tns,tn',
							'Megilah:megilah,mgl', 'Moed Katan:moedkatan,md,mk', 'Chagigah:chagigah,chg', 
							'Yevamos:yevamos,yevamot,yevamoth,yvms,yvmt', 'Kesuvos:kesuvos,kesubos,kesubot,ketubot,ketuvot,ksuvos,ksubos,ksvs,ksvt,ktbt,ks,kt', 
							'Nedarim:nedarim,ndrm,ndr', 'Nazir:nazir,nozir,naz,noz,nzr,nz', 'Sotah:sotah,sota,sot,so,st', 
							'Gitin:gitin,gittin,git,gtn,gt', 'Kiddushin:kiddushin,kidushin,kid,ki,kds,kdshn,kdsh,kd', 
							'Bava Kama:bavakama,babakama,bavakamma,bk,bkama', 
							'Bava Metzia:bavametzia,bavametziah,babametziah,babametzia,bm,bmetziah', 
							'Bava Basra:bavabasra,bavabatra,bababatra,bavabatrah,bb,bbatrah,bbasrah', 'Sanhedrin:sanhedrin,sn,snh,snhd,snhdrn', 
							'Makkos:makkos,makos,makkot,makot,mkt', 'Shevuos:shevuos,shevuot,shavuot,shavuos,shvt,shvs,shvuot,shvuos', 
							'Avoda Zarah:avodazarah,avodazara,avodahzara,avodahzarah,avodah,az,avd,avo,avod,av', 
							'Horayos:horayos,horaiot,horaios,horayot,horiyot,horaot,ho,hor,hrs,hrt,hr', 'Zevachim:zevachim,zevakhim,zvchm,zvkhm', 
							'Menachos:menachos,menachot,menakhos,menakhot,mncht,mnkht', 'Chulin:chulin,chullin,khulin,khullin,chl,khl,chln,khln',
							'Bechoros:bechoros,bchoros,bechorot,bchorot,bcrt,bchrt,bkhrt,bc,bch,bkh', 
							'Erchin:erchin,erkhin,arachin,arakhin,ara,erc,erk', 'Temurah:temurah,tmurah,tmr', 
							'Kerisus:kerisus,krisus,keritut,kritut,kerisos,krisos,keritot,kritot,kerithoth,krithoth,kr,ker,krt,krs', 
							'Meilah:meilah,mei,ml', 'Nidah:nidah,niddah', 
							'Kinim:kinim,kinnim,knm', 'Midos:midos,middos,midoth,middoth,mds,mdt', 'Tamid:tamid,tomid,tmd'], 
				searchType: { book: "tractate of Gemara", partPlural: "tractates" },
				displayName: function (name, match) { 
					return name + " " + match[2] + match[3].toLowerCase() + (match[5] ? '-' + (match[4] || '') + match[5] : '');
				}
			};
		}()));

		register("mt", (function () {
			var chabadMT = function (topic, chpt, mtmap) {
				var base = 'http://www.chabad.org/library/article_cdo/aid/',
					cid = mtmap[topic][3] + mtmap[topic][4][chpt];
				return base + cid;
			},

				mechonMamreMT = function (topic, chpt, law, mtmap) {
					chpt < 10 && (chpt = '0' + chpt);
					var res = mtmap[topic][0] + chpt + '.htm';
					law && (res += '#' + law);
					return 'http://www.mechon-mamre.org/i/' + res;
			},
				hbMT = function (topic, chpt, law, mtmap) {
					// MM's id starts with a hexadecimal book number, so use that.
					var sefer = parseInt( mtmap[topic][0].substr(0, 1), 16 ),
						hilchos = mtmap[topic][1];
					if (hilchos == 0) { return [false, "HebrewBooks.org does not include the Seder Hatefilla or Haggadah."]; }
					return 'http://www.hebrewbooks.org/rambam.aspx?sefer=' + sefer + '&hilchos=' + hilchos + '&perek=' + (chpt || 1)  + '&halocha=' + law; //&rtype=צורת%20הדף
				};
			return {
				regex: /^([a-zA-Z'" .*_]{2,})(?:[;.,\s:]+(\d{1,2}))?(?:[;.,\s:\-]+(\d{1,2}))?$/i,
				link: function (topic, match, flags) {
					//key is topic name. 
					//1st value is MM's topic id. 
					//2nd is Topic index (for HebrewBooks) 
					//3nd is # of chpts. 
					//4th is Chabad.org's topic prefix. 
					//5th (list) is Chabad.org's suffixes.
					var mtmap = {
						"Yesodey HaTorah"                       : ['11',  1, 10, '9049' , ['59', '60', '62', '69', '79', '80', '82', '91', '92', '93', '96']],
						"De'ot"                                 : ['12',  2,  7, '9103' , ['14', '40', '42', '43', '44', '45', '46', '47']],
						"Talmud Torah"                          : ['13',  3,  7, '91'   , ['0970', '0973', '0974', '0975', '0977', '0979', '0980', '1561']],
						"Avodat Kochavim"                       : ['14',  4, 12, '9123' , ['48', '59', '60', '61', '62', '63', '64', '65', '67', '68', '69', '70', '71']],
						"Teshuvah"                              : ['15',  5, 10, '911'  , ['887', '888', '891', '896', '898', '903', '905', '908', '910', '913', '914']],
						"Kri'at Shema"                          : ['21',  6,  4, '91295', ['1', '2', '3', '4', '5']],
						"Tefilah uBirkat Kohanim"               : ['22',  7, 15, '9201' , ['53', '61', '62', '65', '66', '67', '68', '69', '71', '72', '73', '74', '77', '78', '79', '80']],
						"Tefillin, Mezuzah, v'Sefer Torah"      : ['23',  8, 10, '925'  , ['369', '417', '423', '424', '425', '427', '428', '429', '430', '431', '432']],
						"Tzitzis"                               : ['24',  9,  3, '93634', ['0', '1', '2', '3']],
						"Berachot"                              : ['25', 10, 11, '9276' , ['47', '67', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79']],
						"Milah"                                 : ['26', 11,  3, '932'  , ['220', '325', '327', '330']],
						"Seder HaTefilah"                       : ['27',  0,  5, '15080', ['40', '41', '42', '43', '44', '45']],
						"Shabbos"                               : ['31', 12, 30, '935'  , ['196', '197', '201', '202', '203', '204', '206', '207', '208', '210', '211', '218', '219', '221', '222', '223', '237', '238', '239', '240', '241', '242', '243', '244', '245', '247', '248', '249', '250', '251', '256']],
						"Eruvin"                                : ['32', 13,  8, '935'  , ['286', '300', '303', '304', '306', '307', '308', '309', '310']],
						"Shevitat Asor"                         : ['33', 14,  3, '93602', ['5', '6', '7', '8']],
						"Shevitat Yom Tov"                      : ['34', 15,  8, '9360' , ['34', '35', '36', '37', '38', '39', '40', '41', '42']],
						"Chometz U'Matzah"                      : ['35', 16,  8, '937'  , ['298', '300', '301', '302', '303', '304', '305', '306', '307']],
						"Haggadah"                              : ['35',  0,  1, '94417', ['6']],
						"Shofar, Sukkah, v'Lulav"               : ['36', 17,  8, '946'  , ['093', '094', '095', '096', '097', '098', '099', '105', '106']],
						"Shekalim"                              : ['37', 18,  4, '9468' , ['88', '89', '90', '91', '93']],
						"Kiddush HaChodesh"                     : ['38', 19, 19, '9479' , ['15', '18', '19', '20', '21', '22', '23', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '42', '43']],
						"Ta'aniyot"                             : ['39', 20,  5, '95199', ['3', '5', '6', '7', '8', '9']],
						"Megillah vChanukah"                    : ['3a', 21,  4, '95200', ['5', '6', '7', '8', '9']],
						"Ishut"                                 : ['41', 22, 25, '952'  , ['873', '874', '875', '876', '878', '879', '880', '881', '882', '883', '884', '885', '886', '887', '888', '889', '890', '891', '892', '893', '894', '895', '896', '897', '899', '900']],
						"Gerushin"                              : ['42', 23, 13, '9577' , ['04', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18']],
						"Yibbum vChalitzah"                     : ['43', 24,  8, '9606' , ['18', '19', '20', '21', '22', '23', '24', '25', '26']],
						"Naarah Besulah"                        : ['44', 25,  3, '96063', ['2', '4', '5', '6']],
						"Sotah"                                 : ['45', 26,  4, '9606' , ['37', '38', '39', '40', '41']],
						"Issurei Biah"                          : ['51', 27, 22, '9606' , ['44', '47', '48', '49', '51', '52', '53', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70']],
						"Ma'achalot Assurot"                    : ['52', 28, 17, '9682' , ['55', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73']],
						"Shechitah"                             : ['53', 29, 14, '9718' , ['24', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40']],						
						"Shvuot"                                : ['61', 30, 12, '9738' , ['61', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74']],
						"Nedarim"                               : ['62', 31, 13, '9738' , ['79', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92']],
						"Nezirut"                               : ['63', 32, 10, '9835' , ['84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94']],
						"Arachim vaCharamim"                    : ['64', 33,  8, '983'  , ['595', '596', '597', '598', '599', '600', '601', '602', '603']],
						"Kilaayim"                              : ['71', 34, 10, '9866' , ['88', '90', '91', '92', '93', '94', '95', '96', '97', '98', '89']],
						"Matnot Aniyiim"                        : ['72', 35, 10, '986'  , ['699', '702', '703', '704', '705', '706', '707', '708', '709', '710', '711']],
						"Terumot"                               : ['73', 36, 15, '9920' , ['25', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41']],
						"Maaserot"                              : ['74', 37, 14, '9970' , ['69', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85']],
						"Maaser Sheini"                         : ['75', 38, 11, '9970' , ['71', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96']],
						"Bikkurim"                              : ['76', 39, 12, '10025', ['26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38']],
						"Shemita"                               : ['77', 40, 13, '10071', ['57', '61', '62', '64', '65', '67', '68', '70', '71', '73', '74', '76', '77', '78']],
						"Beis Habechirah"                       : ['81', 41,  8, '1007' , ['192', '194', '195', '196', '197', '198', '199', '200', '193']],
						"Kli Hamikdash"                         : ['82', 42, 10, '10082', ['22', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35']],
						"Biat Hamikdash"                        : ['83', 43,  9, '10082', ['36', '42', '43', '44', '45', '46', '47', '48', '49', '50']],
						"Issurei Mizbeiach"                     : ['84', 44,  7, '10082', ['39', '51', '52', '53', '54', '55', '56', '57']],
						"Maaseh HaKorbanot"                     : ['85', 45, 19, '10170', ['09', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '48']],
						"Temidin uMusafim"                      : ['86', 46, 10, '10132', ['52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62']],
						"Pesulei Hamukdashim"                   : ['87', 47, 19, '10208', ['44', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65']],
						"Avodat Yom HaKippurim"                 : ['88', 48,  5, '10629', ['21', '23', '24', '25', '26', '27']],
						"Me'ilah"                               : ['89', 49,  8, '10629', ['22', '28', '30', '31', '32', '33', '34', '35', '36']],
						"Korban Pesach"                         : ['91', 50, 10, '10628', ['65', '74', '75', '80', '81', '82', '83', '84', '85', '86', '87']],
						"Chagigah"                              : ['92', 51,  3, '10628', ['66', '88', '90', '93']],
						"Bechorot"                              : ['93', 52,  8, '1062' , ['867', '894', '895', '896', '897', '898', '899', '900', '901']],
						"Shegagot"                              : ['94', 53, 15, '1062' , ['868', '902', '903', '904', '905', '907', '908', '909', '911', '912', '913', '914', '915', '916', '917', '918']],
						"Mechussarey Kapparah"                  : ['95', 54,  5, '1062' , ['862', '869', '870', '871', '919', '920']],
						"Temurah"                               : ['96', 55,  4, '1061' , ['798', '799', '844', '855', '857']],
						"Tum'at Met"                            : ['a1', 56, 25, '1517' , ['144', '151', '153', '161', '168', '169', '171', '172', '177', '186', '187', '188', '190', '192', '195', '200', '202', '204', '206', '218', '223', '228', '235', '236', '238', '241']],
						"Parah Adummah"                         : ['a2', 57, 15, '1517' , ['250', '254', '255', '256', '259', '261', '264', '300', '304', '305', '308', '314', '319', '321', '323', '327']],
						"Tum'at Tsara'at"                       : ['a3', 58, 16, '1524' , ['492', '493', '497', '500', '502', '507', '510', '511', '514', '516', '517', '518', '521', '523', '524', '527', '530']],
						"Metamme'ey Mishkav uMoshav"            : ['a4', 59, 13, '15245', ['32', '34', '35', '42', '44', '45', '46', '49', '78', '79', '80', '85', '87', '88']],
						"She'ar Avot HaTum'ah"                  : ['a5', 60, 20, '15252', ['14', '16', '26', '29', '30', '31', '32', '34', '36', '37', '39', '40', '41', '43', '46', '47', '48', '49', '50', '53', '55']],
						"Tum'at Okhalin"                        : ['a6', 61, 16, '15253', ['71', '74', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95']],
						"Kelim"                                 : ['a7', 62, 28, '1525' , ['573', '793', '794', '795', '796', '797', '798', '799', '800', '801', '802', '803', '815', '817', '818', '819', '820', '821', '822', '823', '824', '825', '826', '827', '829', '831', '832', '833', '834']],
						"Mikvot"                                : ['a8', 63, 11, '15260', ['62', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75']],
						"Nizkei Mammon"                         : ['b1', 64, 14, '6829' , ['65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '80']],
						"Genevah"                               : ['b2', 65,  9, '10888', ['54', '66', '68', '70', '72', '77', '73', '74', '75', '76']],
						"Gezelah va'Avedah"                     : ['b3', 66, 18, '1088' , ['884', '885', '886', '887', '888', '889', '890', '891', '892', '893', '894', '895', '896', '897', '898', '899', '900', '901', '902']],
						"Chovel uMazzik"                        : ['b4', 67,  8, '10889', ['06', '08', '09', '10', '11', '12', '13', '14', '15']],
						"Rotseah uShmirat Nefesh"               : ['b5', 68, 13, '10889', ['16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29']],
						"Mechirah"                              : ['c1', 69, 30, '136'  , ['2849', '3894', '3896', '3898', '3903', '3906', '3911', '3912', '3921', '3928', '3935', '3936', '3941', '3942', '3946', '3951', '3954', '3955', '3957', '3958', '3959', '3960', '3963', '3965', '3967', '3969', '3970', '3971', '3977', '3980', '3981']],
						"Zechiyah uMattanah"                    : ['c2', 70, 12, '136'  , ['2850', '5795', '5796', '5797', '5798', '5799', '5800', '5801', '5802', '5803', '5805', '5806', '5807']],
						"Shechenim"                             : ['c3', 71, 14, '13628', ['51', '55', '58', '59', '60', '61', '63', '64', '66', '67', '68', '69', '70', '71', '72']],						
						"Sheluchin veShuttafin"                 : ['c4', 72, 10, '136'  , ['2852', '3711', '3712', '3723', '3760', '3786', '3791', '3792', '3793', '3796', '3799']],
						"Avadim"                                : ['c5', 73,  9, '136'  , ['2853', '3800', '2873', '3806', '3808', '3811', '3812', '3813', '3818', '3819']],
						"Sechirut"                              : ['d1', 74, 13, '13686', ['57', '62', '64', '66', '67', '68', '69', '70', '71', '72', '74', '75', '76', '77']],
						"She'elah uFikkadon"                    : ['d2', 75,  8, '11520', ['77', '86', '87', '88', '89', '90', '91', '94', '96']],						
						"Malveh veLoveh"                        : ['d3', 76, 27, '11'   , ['59433', '59438', '59439', '59440', '59441', '59442', '59443', '59444', '59445', '59447', '59449', '59450', '59451', '59452', '59453', '59454', '59455', '61173', '61174', '61175', '61176', '61179', '61180', '61181', '61182', '61183', '61184', '61185']],
						"To'en veNit'an"                        : ['d4', 77, 16, '11'   , ['52032', '52041', '52047', '52053', '52055', '52056', '52058', '67618', '67619', '67620', '68076', '68077', '68078', '68080', '68081', '68082', '68083']],
						"Nehalot"                               : ['d5', 78, 11, '11705', ['29', '30', '31', '32', '33', '34', '35', '37', '38', '39', '40', '41']],
						"Sanhedrin veha'Onashin HaMesurin lahem": ['e1', 79, 26, '11727', ['21', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49']],
						"Edut"                                  : ['e2', 80, 22, '117'  , ['2722', '2769', '2770', '2771', '2772', '2773', '2774', '2775', '2776', '2777', '2778', '8799', '8800', '8801', '8802', '8803', '8804', '8805', '8806', '8807', '8808', '8809', '8810']],
						"Mamrim"                                : ['e3', 81,  7, '11818', ['43', '52', '53', '54', '55', '56', '57', '58']],
						"Avel"                                  : ['e4', 82, 14, '11818', ['78', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95']],
						"Melachim uMilchamot"                   : ['e5', 83, 12, '11883', ['43', '45', '46', '47', '48', '49', '50', '52', '53', '54', '55', '56', '57']]
					}
						chpt = match[2] || 0, //if no chapter specfied, default to 0
						law = chpt && match[3] ? match[3] : '';

					chpt && (chpt = parseInt(chpt, 10)); //if chpt specified, convert to int
					law && (law = parseInt(law, 10)); //same for law

					if (chpt > mtmap[topic][2]) {
						return [false, '"' + chpt + '" is not a valid chapter for Hilchot ' + topic + '. \n\nThere are only ' + (mtmap[topic][2]) + ' chapters in Hilchot ' + topic + '\n\nPlease try again.'];
					}
					if (flags.indexOf('h') !== -1) {
						return hbMT(topic, chpt, law, mtmap);
					}
					return (flags.indexOf('e') !== -1) 
						? chabadMT(topic, chpt, mtmap) 
						: mechonMamreMT(topic, chpt, law, mtmap);
				},
				spellings: ['Yesodey HaTorah:yesodei,yisodei,yisodey,hatorah,hatora,yht,yt,yis', "De'ot:deot,deos,deyos,deios,deyot,deiot,daot,daos", 'Talmud Torah:talmud,torah,tt', 'Avodat Kochavim:avodah,avodat,avodas,kochavim,chukot,chukos,goim,hagoim,ak,zarah,goy,az', 'Teshuvah:teshuvah,tshuvah,tsh', "Kri'at Shema:krias,kriat,kriyat,kriyas,shema,shma,ks,krsh", 'Tefilah uBirkat Kohanim:tefilah,tfilah,tefillah,birkat,birkas,birchas,birchat,kohanim,cohanim,tbk', "Tefillin, Mezuzah, v'Sefer Torah:,tefillin,tefilin,tfilin,mezuzah,mzuzah,sefer,torah,stam", 'Tzitzis:tzitzis,tzizit,tsitsit,tsitsis,sisis,sisit', 'Berachot:berachot,berachos,brachos,brachot', 'Milah:milah,bris,brit', 'Seder HaTefilah:seder,siddur,sidur,hatefilah,hatfilah,tfilah,tefillah', 'Shabbos:shabbat,shabat,shabbos,shabes,shabbes,sh', 'Eruvin:eruvin,eiruvin,er', 'Shevitat Asor:shvisas,shevisas,shevitat,shvitat,asor', 'Shevitat Yom Tov:shvisas,shevisas,shevitat,shvitat,yomtov,yt', "Chometz U'Matzah:chametz,chamets,chometz,ham,matza,massa,masa,matsa,matzo,chm,cm", 'Haggadah:hagada,haggadah,hagadah', "Shofar, Sukkah, v'Lulav:,shofar,sukkah,succah,sukah,succa,lulav", 'Shekalim:sheqalim,shekalim,shkalim,shekolim,shek', 'Kiddush HaChodesh:hodesh,hachodesh,hahodesh,hakhodesh,kidush,kiddush,khc', "Ta'aniyot:taaniyos,taanios,taaniyot,taaniot,tanios,taniyos,taanis,taanit,tanis,taan,taniyot", 'Megillah vChanukah:mg,megila,mgila,megillah,chanukah,chanukkah,hanukkah,hanukka,channuka,han,mgvch,mgch', 'Ishut:ishut,ishus,eshus', 'Gerushin:gerushin,geirushin,gittin,gitin', 'Yibbum vChalitzah:yibbum,yibum,chalitzah,halitzah,chaliza,chalizah,halissa', 'Naarah Besulah:naarah,narah,betulah,bsulah,besulah', 'Sotah:sotah,soda', 'Issurei Biah:issurei,isurei,isurey,issurey,biah,biyah,ib,isub', "Ma'achalot Assurot:maachalot,machalot,maachalos,machalos,assurot,asurot,assuros,asuros,ma,maacha", 'Shechitah:shechitah,shehita,shehitah', 'Sechirut:sechirut,sechirus,sachir,schirus,schirut', "She'elah uFikkadon:sheailah,sheeilah,sheelah,shailah,shaylah,sheaila,fikkadon,pikadon,piqadon", 'Malveh veLoveh:malveh,loveh', "To'en veNit'an:toen,toain,nitan,nitaan", 'Nehalot:nachalos,nachlos,nachlot,nahalot,nahlot,nachalaos,nehalot', 'Kilaayim:kilaayim,kilaim', 'Matnot Aniyiim:matanos,aniyim,tzedaka,mattanot,mattanos,matnot,matnos,aniyiim', 'Terumot:terumos,terumot,ter', 'Maaserot:maaserot,maaseros,mayseros,maser,maas', 'Maaser Sheini:maaser,maser,mayser,sheni,sheini,neta,revai,kerem,msvnr,msnr,ms', "Bikkurim v'Shar Matnot Kehuna Sheb'gvulin:bikkurim,bikurim,shar,shaar,matnot,matnos,matanos,matanot,kehunah,shebgevulin,shebgvulin,bikk", 'Shemita:shemitta,shemitah,shmitah,shmitta,yovel,yoivel,yoival,sy,shy', 'Shvuot:shvuot,shvuos,shevuos,shevuot', 'Nedarim:neder,ndr,nedarim', 'Nezirut:nazir,nezerut,nezirut,naz,nz', 'Arachim vaCharamim:arachim,arachin,erkin,erchin,charamot,charamos,haramim,charamim,cherem,arch,arvch,charamin', 'Beis Habechirah:beit,beis,bet,bes,habechirah,habchirah,habekhirah,bh', 'Kli Hamikdash:kli,klei,kley,hamikdash,hamikdosh,mikdosh,haovdim,bo,ba', 'Biat Hamikdash:biat,bias,hamikdash,hamikdosh', 'Issurei Mizbeiach:issurei,isurei,issurey,isurey,issure,mizbeiach,mizbeyach,mizbeyakh', 'Temidin uMusafim:tmidin,temidin,temidim,tmidim,tamidim,tamidin,musafin,musafim', 'Maaseh HaKorbanot:maseh,maaseh,mayseh,hakorbonos,hakorbanot,hakorbanos', 'Pesulei Hamukdashim:pesulei,pesuley,hamukdashim', 'Avodat Yom HaKippurim:avodat,avodas,avoidas,yom,hakippurim,hakipurim,kippurim,kipur,ayk,yk', "Me'ilah:meilah", "Sanhedrin veha'Onashin HaMesurin lahem:sanhedrin,haonshin,hamesurin,lahem", 'Edut:edus,eduth,edhuth,eidim', 'Mamrim:mamrim,mamrin', 'Avel:uvel,aveilus,aveilut,avelus,aveluth', 'Melachim uMilchamot:melachim,melech,mashiach,melochim,mlochim,mlachim,milchamot,milchamteihem,milchamosehem,milchamoseihem,milchamotehem,milchamoteihem,milchomosehem,milchomoseihem,milhamotehem,milhamoteihem', 'Korban Pesach:korban,karban,pesah,pesach,pesakh', 'Chagigah:chagigah,hagigah', 'Bechorot:bechorot,bechoros,bchorot,bchoros', 'Shegagot:shegagot,shegagos,shgagot,shgagos', 'Mechussarey Kapparah:mechussarey,mechusarei,mechussarei,kapparah,kaparah,mk', 'Temurah:temurah,tmurah', "Tum'at Met:tumas,tumat,met,mes,meit,meis,mais,mait", 'Parah Adummah:parah,poroh,adumah,adummah', "Tum'at Tsara'at:tumas,tumat,tzaraas,tzoras,tzaras,tzaraat,tzarat,tsarat,tsaraat", "Metamme'ey Mishkav uMoshav:metammey,metammeey,metammei,metamei,metamey,mtamei,mtamey,mishkav,mishkov,moshav,mmm", "She'ar Avot HaTum'ah:shear,shar,shaar,avot,avos,hatumah,hatumaa,tumah,sat", "Tum'at Okhalin:tumas,tumat,okhalin,ochalin,oichlin,oichlim,to", 'Kelim:keilim,kelim,ke', 'Mikvot:mikvaot,mikvot,mikvos,mikvaos,mikvah,mkv', 'Nizkei Mammon:nizkei,nizkey,niskei,niskey,mamon,mammon,mamoin,mumoin,nm', 'Genevah:genevah,geneivah,geneiva,gneva,gneivah,gnevah,gne', "Gezelah va'Avedah:gezelah,gezeilah,gzeilah,gzelah,avedah,aveidah,ga,gva", 'Chovel uMazzik:chovel,choivel,choyvel,mazzik,mazik', 'Rotseah uShmirat Nefesh:rotseach,rotzeach,rotseah,rotzeah,rotzeiach,shmirat,shmiras,shemirat,shemiras,nefesh,nafesh,rotz,rusn,rsn', 'Mechirah:mechirah,mehirah,mchirah,mekhirah,mch', 'Zechiyah uMattanah:zechiyah,zekhiyah,zechiah,mattanah,matanah,zech,zch,zm', 'Shechenim:shechenim,shekhenim,shehenim', 'Sheluchin veShuttafin:sheluchin,shluchin,sheluchim,shelukhin,shluchim,shuttafin,shutafin,shutfin,ss,svs', 'Avadim:avadim,avodim,av,avd'],
				searchType: { book: "part of Rambam", partPlural: "topics" },
				displayName: function (inputName, match, isUntouched) {
					var name = "" + (isUntouched ?  "" : "Rambam, Hilchot ") + inputName,
						chapter = match[2] ? " " + match[2] : "",
						law = match[2] && match[3] ? ":" + match[3] : "";
					return name + chapter + law;
				}
			};
		}()));
		
		register("ksa", (function(){
			return {
				regex: /^(\d+)(?:[;.,\s:](\d+))?/i,
				link: function(match, flags){
					var siman_lengths = [7, 9, 8, 6, 17, 11, 8, 6, 21, 26, 25, 15, 5, 8, 13, 5, 10,
							22, 14, 12, 10, 10, 30, 12, 8, 22, 5, 13, 21, 9, 7, 27, 14, 16, 9, 28, 13, 15, 3,
							21, 10, 23, 7, 18, 23, 46, 22, 10, 16, 16, 15, 18, 6, 9, 5, 7, 7, 14, 21, 15, 10,
							18, 5, 4, 30, 12, 11, 12, 9, 5, 5, 23, 11, 4, 14, 23, 24, 11, 10, 93, 5, 13, 6,
							19, 8, 7, 24, 18, 6, 23, 18, 10, 5, 27, 18, 15, 15, 37, 5, 22, 6, 7, 14, 21, 2,
							8, 3, 7, 9, 15, 17, 6, 9, 13, 6, 18, 13, 11, 12, 11, 11, 17, 5, 22, 8, 4, 18, 16,
							23, 6, 17, 5, 31, 15, 22, 10, 13, 10, 26, 3, 23, 10, 22, 9, 26, 4, 5, 4, 13, 17,
							7, 17, 16, 7, 12, 3, 8, 4, 10, 6, 20, 14, 8, 10, 16, 5, 15, 6, 3, 2, 3, 3, 4, 3,
							6, 8, 15, 5, 15, 16, 22, 16, 7, 11, 6, 4, 5, 5, 6, 3, 6, 10, 14, 12, 14, 22, 13,
							16, 17, 11, 7, 16, 5, 10, 9, 11, 7, 15, 8, 9, 15, 5, 5, 3, 3, 3, 3, 2, 9, 10, 8],
						siman = parseInt(match[1], 10),
						sif = parseInt(match[2], 10) || 0,
						url = 'http://www.yonanewman.org/kizzur/kizzur';
						
					if (sif > siman_lengths[siman - 1]){
						return [false, '"There are only ' + siman_lengths[siman -1 ] + ' laws in Chapter ' + siman + '\n\nPlease try again.'];
					}
					if (siman == 80){
						siman += sif <= 31 ? 'a' : (sif <= 62 ? 'b' : 'c');
					}
					return url + siman + '.html' + (sif ? '#' + sif : '');
				},
				spellings: false,
				searchType: false,
				displayName: function (unusedSectionName, match, isUntouched) {
					var name = (isUntouched ?  "" : "Kitzur Shulchan Aruch "),
						siman = parseInt(match[1], 10),
						sif = parseInt(match[2], 10); //if no match[1], parseInt returns NaN
					return name + siman + (sif ? ':' + sif : '');
				}
			};
		}()));
		register("sa", (function(){
			return {
				//Group 0: Section name. Grp 1: Siman
				regex: /^([a-zA-Z'" .*_]{2,})(?:[;.,\s:]+(\d{1,3}))(?:[;.,\s:]+(\d{1,3}))?$/i,
				link: function(section, match, flags){
					var samap = {
						"Orach Chaim"    :['oc',697,["339","342","343","346","348","349","350","351","356","358","360","363","364","366","368","371","371","372","372","373","373","374","374","375","376","380","380","383","384","384","385","385","397","398","400","400","401","401","403","405","406","406","408","410","410","411","414","416","416","416","417","418","418","422","422","425","426","427","429","430","431","432","433","434","435","435","438","438","439","440","441","442","443","444","445","446","447","448","448","449","449","450","450","452","453","453","453","454","455","457","461","461","462","463","464","464","465","465","466","467","467","468","469","469","471","471","472","473","477","477","479","479","480","480","483","483","483","484","485","486","486","486","486","487","490","490","491","492","501","501","502","504","507","507","508","510","511","512","514","515","517","518","518","520","521","521","521","523","524","524","525","526","527","535","538","539","953","953","956","962","966","968","969","970","971","972","976","983","984","986","986","987","987","987","990","991","991","993","996","997","998","999","1000","1002","1004","1004","1005","1005","1008","1009","1010","1010","1012","1014","1014","1015","1016","1018","1018","1019","1020","1021","1025","1026","1029","1030","1032","1032","1036","1038","1039","1042","1044","1044","1044","1045","1047","1048","1049","1051","1051","1052","1052","1053","1054","1055","1055","1056","1056","1056","1057","1057","1059","1060","1060","1062","1063","1063","1063","1064","1065","1419","1420","1422","1425","1427","1430","1431","1433","1436","1436","1437","1441","1445","1448","1448","1448","1450","1451","1452","1453","1454","1455","1459","1461","1462","1465","1467","1468","1469","1469","1475","1477","1479","1480","1481","1483","1484","1485","1486","1487","1487","1489","1489","1491","1492","1492","1493","1494","1495","1495","1496","1497","1497","1498","1498","1500","1501","1504","1507","1507","1516","1518","1521","1522","1525","1528","1534","1542","1544","1545","1549","1550","1552","1556","1559","1563","1565","1573","1576","1580","1584","1585","1588","1589","1594","1596","1596","1602","1602","1604","1606","1606","1606","1612","1613","1615","1616","1617","1619","1622","1622","1623","1624","2075","2077","2078","2079","2079","2080","2080","2081","2082","2082","2083","2084","2085","2086","2087","2088","2088","2089","2091","2098","2099","2101","2103","2104","2105","2105","2107","2107","2110","2110","2111","2112","2112","2113","2113","2113","2114","2115","2117","2118","2118","2118","2119","2119","2120","2120","2120","2120","2121","2122","2122","2122","2123","2123","2125","2126","2126","2126","2127","2127","2127","2129","2129","2129","2130","2132","2132","2132","2132","2133","2133","2133","2136","2136","2137","2137","2137","2137","2139","2140","2140","2140","2141","2142","2144","2146","2146","2148","2149","2152","2154","2154","2157","2158","2159","2161","2163","2164","2170","2172","2174","2177","2179","2188","2194","2194","2197","2206","2208","2211","2211","2215","2216","2218","2218","2221","2222","2225","2227","2228","2228","2229","2230","2241","2243","2243","2244","2245","2247","2251","2252","2254","2254","2255","2255","2256","2256","2257","2257","2258","2259","2259","2259","2261","2261","2264","2265","2265","2265","2267","2825","2826","2827","2831","2837","2838","2841","2844","2846","2848","2849","2850","2853","2856","2856","2858","2860","2860","2863","2865","2869","2874","2874","2875","2879","2880","2880","2880","2880","2880","2881","2881","2884","2889","2889","2890","2890","2891","2891","2892","2892","2892","2892","2895","2895","2897","2897","2898","2898","2899","2899","2901","2902","2903","2905","2905","2906","2912","2914","2915","2918","2918","2919","2919","2920","2922","2923","2924","2927","2927","2927","2929","2930","2930","2934","2934","2934","2935","2935","2935","2936","2937","2938","2938","2938","2938","2939","2942","2943","2944","2945","2946","2952","2952","2954","2955","2958","2960","2960","2961","2961","2961","2962","2963","2963","2963","2964","2964","2965","2965","2966","2967","2969","2971","2972","2972","2972","2973","2975","2977","2978","2979","2980","2980","2982","2983","2983","2984","2985","2986","2987","2987","2990","2990","2991","2994","2998","3000","3001","3003","3004","3005","3005","3007","3008","3013","3015","3015","3015","3016","3017","3019","3021","3021","3026","3030","3030","3036","3037","3037","3037","3037","3038","3038","3040","3040","3040","3041","3041","3042","3043","3043","3044","3044","3045","3046","3046","3049","3051","3053","3054","3055","3056","3058","3058","3058","3058","3059","3060","3060","3061","3062","3062","3064","3065","3068","3070","3072","3073","3074","3075","3076","3078"]],
						"Yoreh De'ah"    :['yd',403,["3474","3483","3489","3490","3492","3493","3495","3495","3495","3496","3499","3501","3501","3503","3506","3508","3512","3513","3518","3520","3522","3523","3525","3528","3533","3534","3535","3537","3543","3544","3546","3548","3549","3556","3559","3567","3574","3579","3581","3590","3592","3595","3597","3600","3603","3604","3607","3608","3616","3617","3619","3621","3624","3627","3628","3635","3638","3646","3649","3649","3651","3656","3657","3659","4132","4135","4138","4139","4143","4161","4168","4169","4173","4176","4177","4179","4182","4184","4184","4185","4187","4192","4194","4199","4206","4207","4212","4222","4224","4226","4230","4235","4248","4251","4258","4264","4268","4271","4279","4287","4289","4295","4299","4303","4305","4317","4318","4321","4325","4327","4348","4354","4358","4362","4365","4369","4372","4376","4381","4389","4395","4400","4993","5000","5011","5014","5016","5024","5026","5032","5035","5038","5041","5042","5047","5051","5052","5055","5058","5060","5060","5065","5072","5074","5074","5076","5079","5079","5081","5083","5083","5086","5087","5088","5089","5091","5091","5095","5098","5099","5108","5111","5114","5116","5117","5118","5119","5120","5120","5133","5137","5137","5141","5148","5150","5151","5153","5166","5167","5170","5171","5172","5475","5475","5480","5483","5484","5495","5498","5513","5527","5529","5532","5533","5535","5539","5544","5547","5558","5561","5563","5584","6590","6590","6592","6593","6595","6595","6597","6597","6598","6600","6600","6601","6602","6605","6608","6615","6617","6618","6622","6628","6629","6630","6630","6630","6632","6633","6650","6653","6654","6654","6662","6662","6675","6679","6682","6683","6687","6692","6696","6697","6708","6709","6712","6714","6719","6719","6721","6723","6723","6726","6728","6730","6730","6731","6733","6735","6738","6743","6743","6743","6745","6746","6748","6752","6756","6769","6772","6774","6775","6777","6778","6780","6782","6785","6790","6790","6791","6792","6794","6796","6798","6799","6800","6800","6804","6804","6806","6807","6808","6809","6811","6813","6821","6822","6828","6831","6834","6835","6838","6841","6842","6842","6843","6852","6854","6854","6855","6855","6856","6856","6856","6858","6860","6861","6863","6863","6864","6864","6868","6871","6872","6875","6878","6879","6881","6882","6883","6885","6886","6903","6903","6904","6914","6915","6916","6916","6916","6918","6923","6926","6928","6928","6929","6930","6930","6930","6931","6932","6932","6932","6932","6933","6933","6933","6933","6934","6934","6934","6935","6936","6936","6937","6939","6940","6940","6940","6941","6941","6942","6946","6947","6948","6951","6954","6957","6957","6958","6959","6961","6962","6962","6963","6963","6964","6964","6964","6965","6966","6967","6968","6969","6970","6970","6971","6972","6973","6974","6977","6978","6978","6982"]],
						"Even Ha'ezer"   :['eh',178,["7487","7492","7495","7498","7508","7512","7517","7524","7524","7525","7527","7531","7532","7537","7537","7541","7542","7591","7591","7591","7592","7595","7598","7599","7599","7601","7602","7606","7617","7621","7623","7626","7627","7628","7628","7633","7634","7640","7647","7649","7651","7652","7658","7659","7661","7663","7665","7666","7667","7667","7673","7675","7676","7680","7680","7682","7683","7683","7683","7684","7684","7686","7690","7690","7692","7693","7698","7700","7703","7704","7708","7709","7709","7709","7711","7713","7716","7722","7723","7724","7726","7727","7728","7729","7729","7733","7734","7735","7736","7737","7743","7745","7747","7753","7753","7755","7760","7762","7764","7765","7770","7771","7773","7775","7776","7777","7779","7780","7781","7782","7782","7783","7787","7790","7792","7799","7800","7804","8101","8107","8114","8118","8120","8122","8127","8136","8143","8146","8150","8173","8177","8178","8181","8181","8184","8185","8186","8187","8189","8192","8194","8207","8213","8217","8220","8222","8223","8224","8225","8226","8227","8227","8229","8230","8265","8268","8273","8275","8276","8277","8279","8280","8280","8281","8283","8285","8286","8287","8288","8306","8308","8308","8309","8311","8312","8313","8313","8315"]],
						"Choshen Mishpat":['cm',427,["8697","8701","8702","8705","8708","8709","8709","8713","8715","8718","8719","8720","8724","8725","8729","8731","8732","8737","8739","8740","8742","8743","8748","8750","8752","8776","8777","8778","8787","8788","8795","8797","8798","8803","8813","8816","8822","8830","8833","8846","8848","8854","8861","8869","8873","8881","8903","8906","8908","8916","8918","8921","8924","8924","8927","8928","8940","8941","8947","8948","8958","8963","8969","8971","8973","8989","9019","9023","9025","9032","9037","9047","9085","9096","9445","9463","9465","9472","9476","9483","9484","9504","9517","9519","9521","9528","9538","9557","9572","9578","9584","9593","9598","9603","9605","9613","9617","9624","9626","9630","9631","9634","9635","9641","9648","9651","9652","9657","9666","9668","9672","9677","9680","9682","9683","9696","9697","9700","9701","9704","9706","9714","9720","9726","9726","9732","9746","9747","9750","9757","9760","9763","10292","10295","10297","10297","10298","10299","10302","10303","10308","10311","10312","10313","10314","10315","10324","10326","10327","10334","10338","10338","10339","10344","10353","10364","10369","10373","10376","10377","10378","10379","10381","10389","10391","10391","10392","10392","10393","10393","10394","10399","10401","10402","10403","10416","10433","10435","10436","10436","10436","10437","10442","10447","10448","10452","10453","10453","10455","10456","10462","10463","10467","10468","10471","10475","10475","10478","10481","10484","10489","10490","10493","10497","10500","10505","10506","10517","10519","10526","10528","10530","10534","10535","10538","10540","10543","10544","10547","10548","10550","10551","10554","10556","10557","10558","10560","10570","10572","10572","10574","10577","10584","10585","10586","10591","10594","10595","10596","10597","11105","11110","11112","11119","11121","11124","11127","11129","11134","11135","11144","11145","11147","11159","11159","11166","11167","11169","11170","11173","11179","11180","11184","11184","11187","11188","11189","11193","11194","11196","11197","11197","11199","11201","11201","11206","11207","11209","11214","11216","11218","11223","11224","11225","11226","11229","11230","11231","11232","11232","11238","11248","11256","11257","11259","11262","11264","11268","11269","11269","11270","11272","11273","11275","11276","11278","11283","11285","11286","11287","11289","11291","11296","11297","11298","11299","11301","11304","11304","11305","11306","11308","11309","11309","11309","11310","11310","11310","11310","11310","11311","11312","11315","11324","11325","11327","11327","11329","11330","11332","11335","11337","11338","11338","11340","11341","11344","11344","11347","11348","11349","11350","11350","11353","11355","11356","11359","11360","11362","11363","11365","11367","11368","11372","11373","11374","11375","11377","11378","11380","11381","11381","11382","11383","11383","11384","11385","11385","11386","11386","11387","11388","11390","11391","11391","11391","11399","11399","11407","11409","11411","11413","11413","11413","11414","11414","11415","11416","11416","11417","11419","11420","11421","11421","11421","11422","11423","11424","11424","11424","11428","11428","11429","11429","11430","11430","11430","11431","11433","11435","11439","11441","11441","11441","11443","11445","11445"]]
					},
						siman = parseInt(match[2], 10) || false;
						
					if (siman > samap[section][1]){
						return [false, '"There are only ' + samap[section][1] + " simanim in " + section + '\n\nPlease try again.'];
					}	
					var prefix = 'http://beta.hebrewbooks.org/tursa.aspx?a=';
					return prefix + samap[section][0] + '_x' + samap[section][2][siman - 1];
				},
				spellings: ["Orach Chaim:oc,chayim","Yoreh De'ah:yd,yoreh,deah","Even Ha'ezer:eh,haezer","Choshen Mishpat:cm,chm"],
				searchType: { book: "section", partPlural: "sections" },
				displayName: function (inputName, match, isUntouched) {
					var name = (isUntouched ?  "" : "Shulchan Aruch, ") + inputName,
						siman = match[2] ? " " + parseInt(match[2], 10) : "",
						sif = match[2] && match[3] ? ":" + parseInt(match[3], 10) : "";
					return name + siman + sif;
				}
			}
		}()));
	}());

	function repl(elem, type, force){
		var matches = reference(elem.value),
			res = elem.value,
			errors = false;
		$.each(matches, function(i, m){
			if (!m[1]) errors = true;
			m[1] && (res = res.replace(m[0][0], m[0][1] + m[2]));
		});
		
		var msg = 'There are invalid references in your '+type+'. Are you sure you want to continue?';
		if (force || !errors || confirm(msg)){
			elem.value = res;
			highlight(elem);
			return true;
		}else{
			return false;
		}
	}
	
	function highlight(elem){
		var res = $(elem).val().replace(/[<>]/g, '`');//Prevent later parsing of any html in the textarea when .html() is called
		var matches = reference($(elem).val()),
			ids = [],
			r, cl, hl;
		$.each(matches, function(i, m){
			ids.push(['.grp'+i, m[2].replace(/\n/g, '<br>')]);
			r = m[0][2];
			cl = m[1] ? 'match' : 'error';
			hl = '<span class="'+cl+'"><span class="grp'+i+'">'+ r.match(/[\[a-zA-Z'\]]+|[0-9]+|[.,;:'*_ -]/g).join('</span>'+'<span class="grp'+i+'">') + '</span></span>';
			res = res.replace(m[0][0], m[0][1] + hl);
		});
		$(elem).next('pre').html(res);
		$('.error').css('background-color','pink');
		$('.match').css('background-color','lightgreen');
		$.each(ids, function(i, id){
			$(id[0]).parent().data('msg', id[1]);
		});
	}
	
	function tHijack(elem){
		var pre = $('<pre>'+escape(elem.value)+'</pre>');
		pre.css({
			color:'transparent',
			border:'none',
			padding:$(elem).css('padding'),
			opacity:'.5',
			position:'absolute',
			top:$(elem).offset().top - $(elem).parent().offset().top + 'px',
			'font-size':$(elem).css('font-size'),
			'font-family':$(elem).css('font-family'),
			'line-height':$(elem).css('line-height'),
			'text-align':'left',
			'pointer-events':'none',
			'background-color':'transparent',
			'white-space':'pre-wrap',
			'overflow':'hidden',
			'max-height':'none',
			})
			.css({padding:'+=1'});
		$(elem).after(pre);

		elem.id == 'input' && pre.css('padding','2px 3px');//different padding for chat
		
		$(elem).on('input focus mousemove scroll',function(){
			var scrollBarWidth = $(elem).innerWidth() - $(elem)[0].scrollWidth;
			pre.width($(elem).width() - scrollBarWidth).height($(elem).height());//for resizing.
			pre.scrollTop($(elem).scrollTop());//for scrolling.
		});
		var helpCount = 0;
		$(elem).on('input', function(e){
			//check for help
			newHelpCount = ($(this).val().match(/\[h\]|\[help\]/g) || []).length;
			if (newHelpCount > helpCount) {
				showHelpPanel();
			} else if (newHelpCount === 0) {
				closeHelpPanel();
			}
			helpCount = newHelpCount;
		});
		$(elem).on('input focus mousedown keydown', function(){
			highlight(this);
		});
		$(elem).on('mouseout', function(){
			$('#myr-tooltip').remove();
		});//remove tooltip if mouse leaves box. Can't rely on mousemove.
		
		$(elem).on('mousemove input', function (e){
			var over_element = false;
			$.each($('.error, .match'), function(i, m){
				//If Mouse is above the current element, go no further.
				if (e.pageY < $(m).offset().top) return false; 
				if (e.pageY < ($(m).offset().top + $(m).height())){
					$.each($(m).children(), function(i, g){
						var gOffset = $(g).offset(),
							gWidth  = $(g).width(),
							gHeight = $(g).height();
						if (e.pageX >= gOffset.left && e.pageX <= (gOffset.left + gWidth) && e.pageY > gOffset.top && e.pageY < (gOffset.top + gHeight)) {
							$('#myr-tooltip').is('p') || $("body").append("<p id='myr-tooltip'>"+ $(g).parent().data('msg') +"</p>");
							var tooltip = $('#myr-tooltip');
							tooltip.css({
									top:'0px',
									left:(e.pageX + 20) + "px",
									position:'absolute',
									border:'1px solid #333',
									background:'#f7f5d1',
									padding:'2px 5px',
									'max-width':'300px',
									'overflow-wrap':'break-word',
									'z-index':'2',
									})
							 .fadeIn("fast");
							if (tooltip.height() + e.pageY > $(document).height()) {//if the tooltip runs below the page.
								tooltip.css('top', ($(document).height() - tooltip.height()) + (e.pageY - gOffset.top) - 20 + 'px');
							}else{
								tooltip.css({top:(e.pageY - 10) + "px"});
							}
							over_element = true;
							return false;
						}
					});
				}
				//return false escape each loop
				if (over_element) return false;
			});
			!over_element && $("#myr-tooltip").remove();
		});
	}
	function checkForHelp(elem){
		if (/\[h\]|\[help\]/.test($(elem).val())) {
			showHelpPanel();
		} else {
			closeHelpPanel();
		}
	}
	function showHelpPanel(){
		if ($('#reference-help-panel').length === 0) {
			$panel = $('<div id="reference-help-panel">').css({
				position: "fixed",
				display: "block",
				top: 0,
				right: -500,
				height: "100%",
				width: 500,
				"z-index":10,
				"text-align": "left",
				"overflow-y": "auto",
				"background-color": "rgba(234, 234, 234, 0.9)",
			}).appendTo('body');
			$panel.append('<style>#reference-help-panel ul{margin-left:30px; list-style:disc;}</style>');
			$close = $('<a id="referencer-panel-close" style="position:absolute;right:10px;top:10px;">Close</a>');
			$close.appendTo($panel);
			$close.click(closeHelpPanel);
			
			$.getJSON("https://api.stackexchange.com/2.2/answers/1765?site=meta.judaism&filter=!SWJ_BpAceOT6L*E)hy", function(data){
				console.log('loaded json');
				$body = $('<div id="reference-help-text" style="margin:20px">').append(data.items[0].body);
				$panel.append($body);
				$panel.animate({right:0});
			});
		} else {
			$panel.animate({right:0});
		}
	}
	
	function closeHelpPanel(){
		$('#reference-help-panel').animate({right:-500});
	}
	
	$(document).on('focus', '[name="comment"]:not(.ref-hijacked)', function(){
		$(this).addClass('ref-hijacked');//add a class.
		tHijack(this);
		$(this).parents('form').data('events').submit.splice(0, 0, {handler:function(e){
			if (!repl(this[0], 'comment')) {
				e.stopImmediatePropagation(); //prevent submit
				return false; //prevent page reload
			}else if ($(this[0]).val().length > 600){
				$(this[0]).trigger('charCounterUpdate');//update char counter
				$(this).find('.text-counter').hide(100,function(){$(this).show(100)}); //simulate a rejected submission.
				e.stopImmediatePropagation(); //prevent submit
				return false; //prevent page reload
			}
		}});
	});
	
	$(document).on('focus', '#input:not(.ref-hijacked)', function(){
		$(this).addClass('ref-hijacked');//add a class.
		tHijack(this);
		$('#input').data('events').keydown.splice(0, 0, {handler:function(e){
			if(!e.shiftKey && e.which == 13 && !repl(this, 'chat message')){
				e.stopImmediatePropagation();
				return false;
			}
		}});
		$('#sayit-button').on('mousedown', function(){
			repl($('#input')[0], 'chat message') && $(this).trigger('click');
		});
	});
	
	$(document).on('focus', '.wmd-input:not(.ref-hijacked)', function(){
		$(this).addClass('ref-hijacked');//add a class.
		tHijack(this);
		
		var previewPane = $('#' + $(this).attr('id').replace('input','preview')),//select the preview element
			clonedPane = previewPane.clone().attr('id', 'wmd-preview-hij');//clone the preview and change the clone's id
		previewPane.after(clonedPane).css({'display':'none'});//append the clone, and hide the original preview 
		
		$(this).focus(function(){
			StackExchange.MarkdownEditor.refreshAllPreviews();
			clonedPane.html(previewPane.clone(false).html());
		});
		// if you use focus, you will have conflicts with SE's lists and image insertions.
		// mousedown causes problems in newer FF versions.
		$(this).on('input mouseup', function(){
			var oldText = this.value, // save the old text
				start = this.selectionStart, // save the old cursor location
				end = this.selectionEnd;
			repl(this, '', true); // replace the text in the textarea, ignoring errors
			StackExchange.MarkdownEditor.refreshAllPreviews(); // refresh the hidden preview
			clonedPane.html(previewPane.clone(false).html()); // update the visible preview from the hidden one
			this.value = oldText; // and undo the textarea's text
			this.setSelectionRange(start, end); // and its cursor
			highlight(this);
		});
		var t = this;
		$(this).parents('form').data('events').submit.splice(0, 0, {handler : submit});
		function submit(e){
			var type = /\/questions\/ask/.test(window.location.pathname) && t.id == 'wmd-input' ? 'question' : 'answer';
			if (!repl(t, type)){
				e.stopImmediatePropagation();// prevent SE's handlers.
				return false;
			}
		}
	});
});
