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
// @version      3.5.3
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
		regex: /^.*$/i,							 // a regular expression to match on

		spellings: ["canonicalName:spelling1, sp2"],// An array of strings. See @HodofHod for more info

		searchType: {							   // human-readable text to fill in here:
			book : "string",						//	  "we couldn't figure out which " + {{book}} + " you were trying to link to.
			partPlural : "strings"				  //	  "... seemed ambiguous to our system, and could have referred to multiple " + {{partPlural}} + ".
		},
		nameOverrides: {							// an optional property to override
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
			regex = new RegExp("(\\(|\\s|^)(\\[\\s*(" + prefixes.join("|") + ")[;,. :-]" +
							   "([^\\]\\[]+?)" +
							   "(?:[;.,\\s:-]+([a-z]{0,4}))?\\s*\\])($|[\\s,\?.;:\\)])", "mig");
		$.each(t.split('\n'), function (i, line){
			while (line.indexOf('	') !== 0 && (match = regex.exec(line)) !== null) {
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
			CAPTURE_INDEX_OF_NAME = 1;
		options = (options || '').toLowerCase();
		if (!match || (value.match(/\d+/g) || []).length > 3) return [false, 'Bad syntax'];
		searchResult = search(match[CAPTURE_INDEX_OF_NAME], linker.spellings, linker.searchType);
		if (!searchResult[0] && searchResult[1].search(/ambiguous/) !== -1){
			match = !!linker.regex2 && linker.regex2.exec(value);
			(match) && (searchResult = search(match[CAPTURE_INDEX_OF_NAME], linker.spellings, linker.searchType));
		}
		if (!searchResult[0]) return searchResult;
	
		
		var url = linker.link(searchResult[1], match, options);//returns either url, or [false, error_message]
		if (url[0]) {
			url = [true, url];
			var addLink = options.indexOf("l") !== -1,
				untouched = options.indexOf("u") !== -1;

			if (untouched || addLink) {
				if (untouched) { // u means use the name the user passed in
					displayText = linker.displayName(match[CAPTURE_INDEX_OF_NAME], match, true);
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

		if (!found) { //No match :( (Redundant; if anything has been found we already returned)
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
				};

			return {
				regex : /^([12]?[a-zA-Z'".*_ ]{2,}?\.?[12]?)[;.,\s:]+(\d{1,3})(?:[;.,\s:\-]+(\d{1,3}))?$/i,
				regex2: /^([a-zA-Z'".*_ ]{2,}[12]?)[;.,\s:]+(\d{1,3})(?:[;.,\s:\-]+(\d{1,3}))?$/i,
				link: function (book, match, flags) {
					//Keys are book names (duh) first value is chapter 1's id for chabad.org. 2nd value is number of chapters
					//Third value is Mechon Mamre's book id
					var map = {'Tzefaniah': [16200, 3, '21'], 'Hoshea': [16155, 14, '13'], 'Nachum': [16194, 3, '19'], 'Michah': [16187, 7, '18'], 'Shoftim': [15809, 21, '07'], 'Melachim II': [15907, 25, '09b'], 'Tehillim': [16222, 150, '26'], 'Nechemiah': [16508, 13, '35b'], 'Kohelet': [16462, 12, '31'], 'Yirmiyahu': [15998, 52, '11'], 'Amos': [16173, 9, '15'], 'Zechariah': [16205, 14, '23'], 'Melachim I': [15885, 22, '09a'], 'Divrei Hayamim II': [16550, 36, '25b'], 'Shmuel I': [15830, 31, '08a'], 'Yeshayahu': [15932, 66, '10'], 'Shmuel II': [15861, 24, '08b'], 'Yonah': [16183, 4, '17'], 'Rus': [16453, 4, '29'], 'Shir HaShirim': [16445, 8, '30'], 'Vayikra': [9902, 27, '03'], 'Ezra': [16498, 10, '35a'], 'Esther': [16474, 10, '33'], 'Yehoshua': [15785, 24, '06'], 'Yechezkel': [16099, 48, '12'], 'Iyov': [16403, 42, '27'], 'Divrei Hayamim I': [16521, 29, '25a'], 'Mishlei': [16372, 31, '28'], 'Daniel': [16484, 12, '34'], 'Devarim': [9965, 34, '05'], 'Yoel': [16169, 4, '14'], 'Chavakuk': [16197, 3, '20'], 'Bamidbar': [9929, 36, '04'], 'Chaggai': [16203, 2, '22'], 'Shemot': [9862, 40, '02'], 'Malachi': [16219, 3, '24'], 'Bereishit': [8165, 50, '01'], 'Eichah': [16457, 5, '32'], 'Ovadiah': [16182, 1, '16']
							  },
						chpt = match[2],
						vrs = match[3] || '';

					flags = flags.toLowerCase(); //more matching purposes
					if (chpt === '0') { //If the chapter number is 0, then someone's trying to cheat me!
						return [false, '"0" is not a valid chapter number. Please try again.'];
					}

					if (chpt > map[book][1]) { //Stop trying to sneak fake chapters in, aright?
						return [false,'"' + chpt + '" is not a valid chapter for ' + book + '. \n\nThere are only ' + map[book][1] + ' chapters in ' + book + '\n\nPlease try again.'];
					}
					return (flags.indexOf('m') !== -1) //Mechon Mamre flag is set?
						? mechonMamreT(book, chpt, vrs, map)
						: chabadT(book, chpt, vrs, flags, map); //Default to Chabad.org
				},
				//nameOverrides: {"Esther" : "Ester" },
				spellings: ['Divrei Hayamim I:1,ch,chron,chroniclesi,cr,dh,divreihayamim,divreihayamimi,firstchronicles,i,ichr,ichronicles', 'Melachim I:1,firstkgs,firstkings,i,ikgs,ikings,k,kg,ki,kings,kingsi,melachim,melachimi,mlachima,stkings', 'Divrei Hayamim II:2,ch,chron,chroniclesii,cr,dh,divreihayamim,divreihayamimii,ii,iichr,iichronicles,secondchronicles', 'Melachim II:2,ii,iikgs,iikings,k,kg,ki,kings,kingsii,melachim,melachimii,mlachimb,ndkings,secondkgs,secondkings', 'Bereishit:beraishis,beraishit,berayshis,bereishis,bereishit,bereshit,braishis,braishit,brayshis,brayshit,breishis,breishit,ge,genesis,geneza,gn', 'Yirmiyahu:je,jeremia,jeremiah,jeremija,jr,yeremiyah,yeremiyahu,yirmiyahu', 'Michah:mch,mi,micah,micha,michah,miha,miq', 'Rus:rt,rth,ru,rus,ruta,ruth', 'Shemot:ex,exd,exod,exodus,sh,shemos,shemot,shmos,shmot', 'Vayikra:lb,le,leu,leviticus,lv,vayikra,vayiqra,vayyikra,vayyiqra', 'Bamidbar:bamidbar,bmidbar,br,nb,nm,nomb,nu,numbers', 'Devarim:de,deut,deuteronomio,deuteronomium,deuteronomy,devarim,dvarim,dt', 'Yehoshua:ios,josh,joshua,josua,joz,jsh,yehoshua,yoshua', 'Shoftim:jdgs,jg,jt,judg,judges,jue,juges,shofetim,shoftim', 'Shmuel I:1,firstsamuel,i,isam,isamuel,s,sa,samuel,samueli,shmuel,shmuela,shmueli,sm', 'Shmuel II:2,ii,iisam,iisamuel,s,sa,samuel,samuelii,secondsamuel,shmuel,shmuelb,shmuelii,sm', 'Yeshayahu:is,isaiah,isiah,yeshayah,yeshayahu', 'Yechezkel:,ez,ezec,ezekial,ezekiel,hes,yecheskel,yechezkel', 'Hoshea:ho,hosea,hoshea', 'Yoel:ioel,jl,joel,jol,yoel', 'Amos:am,amos,ams', 'Ovadiah:ab,abdija,ob,obad,obadiah,obadija,obadja,obd,ovadiah,ovadyah', 'Yonah:ion,jna,jnh,jona,jonah,yonah', 'Nachum:na,nachum,naham,nahum,nam', 'Chavakuk:chavakuk,ha,habacuc,habakkuk,habakuk,habaqquq,habaquq', 'Tzefaniah:sefanja,sofonija,soph,tsefania,tsephania,tzefaniah,tzephaniah,zefanija,zefanja,zeph,zephanja,zp', 'Chaggai:chagai,chaggai,hagai,haggai,haggay,hg,hgg', 'Zechariah:sacharja,za,zach,zacharia,zaharija,zc,zch,zech,zechariah,zecharya,zekhariah', 'Malachi:malachi,malahija,malakhi,maleachi,ml', 'Tehillim:ps,psalm,psalmen,psalmi,psalms,psg,pslm,psm,pss,salmos,sl,tehilim,tehillim,thilim,thillim', 'Mishlei:mishlei,mishley,pr,prou,proverbs,prv', 'Iyov:hi,hiob,ijob,iyov,iyyov,jb', 'Shir HaShirim:sgs,shirhashirim,sng,so,song,songofsolomon,songofsongs,sos,ss,canticles', 'Eichah:aichah,eichah,eikhah,la,lamentaciones,lamentations,lm', 'Kohelet:ec,eccl,ecclesiastes,ecl,koheles,kohelet,qo,qohelet,qoheleth,qohleth', 'Esther:ester,estera,esther', 'Daniel:da,daniel,dn', 'Ezra:esra,ezra', 'Nechemiah:ne,nechemiah,nehemia,nehemiah,nehemija,nehemyah'],
				searchType: { book: "book of Tanakh", partPlural: "books" },
				displayName: function (name, match) {
					var verse = match[3] ? ":" + match[3] : '';
					return name + " " + match[2] + verse;
				}
			};
		}()));

		register("g", {
			regex: /^([a-zA-Z'" .*_]{2,})[;.,\s:]+(\d{1,3})([ab])$/i,
			link: function (mes, match, flags) {
				var mesechtos = {'Chulin': [31, 141], 'Eruvin': [3, 104], 'Horayos': [28, 13], 'Rosh Hashanah': [9, 34], 'Shekalim': [5, 22], 'Menachos': [30, 110], 'Megilah': [11, 31], 'Bechoros': [32, 60], 'Brachos': [1, 63], 'Gitin': [19, 89], 'Taanis': [10, 30], 'Moed Katan': [12], 'Beitzah': [8, 39], 'Bava Kama': [21, 118], 'Kesuvos': [15, 111], 'Sanhedrin': [24, 112], 'Nazir': [17, 65], 'Kiddushin': [20, 81], 'Pesachim': [4, 120], 'Bava Basra': [23, 175], 'Sotah': [18, 48], 'Bava Metzia': [22, 118], 'Yoma': [6, 87], 'Succah': [7, 55], 'Meilah': [36, 21], 'Shabbos': [2, 156], 'Erchin': [33, 33], 'Nedarim': [16, 90], 'Shevuos': [26, 48], 'Temurah': [34, 33], 'Kerisus': [35, 27], 'Zevachim': [29, 119], 'Makkos': [25, 23], 'Avoda Zarah': [27, 75], 'Nidah': [37, 72], 'Chagigah': [13, 26], 'Yevamos': [14, 122]
					},
					page = match[2],
					side = match[3],
					res;

				if (parseInt(page, 10) > mesechtos[mes][1] || page === '1' || page === '0') { //if mesechta doesn't have that page
					return [false, '"' + page + side + '" is not a valid page for Mesechtas ' + mes + '. Page numbers should be between 2 and ' + mesechtos[mes][1] + '. Please try again.'];
				}
				if (side.toLowerCase() === 'a') side = ''; //hebrewbooks is weird.
				res = 'http://hebrewbooks.org/shas.aspx?mesechta=' + mesechtos[mes][0] + '&daf=' + page + side + '&format=';
				res += (flags.indexOf('t') !== -1) ? 'text' : 'pdf';//text version flag is set?
				return res;
			},
			spellings: ['Brachos:berachos,berachot,brachos,brachot,brcht,brchs', 'Shabbos:shabbos,shabbat,shabbas,shabos,shabat,shbt,shbs', 'Eruvin:eruvin,eiruvin,ervn,er', 'Pesachim:pesachim,psachim,pesakhim,psakhim,pes,psa,pschm,ps', 'Shekalim:shekalim,shekolim,shkalim,shkolim,shk,shek', 'Yoma:yoma,yuma,ym', 'Succah:succah,sukkah,suka,sukah,sk,sc', 'Beitzah:beitzah,betzah,betza,btz', 'Rosh Hashanah:rosh,hashana,rsh,rh', 'Taanis:taanis,taanith,tanith,tanis,tns,tn', 'Megilah:megilah,mgl', 'Moed Katan:moedkatan,md,mk', 'Chagigah:chagigah,chg', 'Yevamos:yevamos,yevamot,yevamoth,yvms,yvmt', 'Kesuvos:kesuvos,kesubos,kesubot,ketubot,ketuvot,ksuvos,ksubos,ksvs,ksvt,ktbt,ks,kt', 'Nedarim:nedarim,ndrm,ndr', 'Nazir:nazir,nozir,naz,noz,nzr,nz', 'Sotah:sotah,sota,sot,so,st', 'Gitin:gitin,gittin,git,gtn,gt', 'Kiddushin:kiddushin,kidushin,kid,ki,kds,kdshn,kdsh,kd', 'Bava Kama:bavakama,babakama,bavakamma,bk,bkama', 'Bava Metzia:bavametzia,bavametziah,babametziah,babametzia,bm,bmetziah', 'Bava Basra:bavabasra,bavabatra,bababatra,bavabatrah,bb,bbatrah,bbasrah', 'Sanhedrin:sanhedrin,sn,snh,snhd,snhdrn', 'Makkos:makkos,makos,makkot,makot,mkt', 'Shevuos:shevuos,shevuot,shavuot,shavuos,shvt,shvs,shvuot,shvuos', 'Avoda Zarah:avodazarah,avodazara,avodahzara,avodahzarah,avodah,az,avd,avo,avod,av', 'Horayos:horayos,horaiot,horaios,horayot,horiyot,horaot,ho,hor,hrs,hrt,hr', 'Zevachim:zevachim,zevakhim,zvchm,zvkhm', 'Menachos:menachos,menachot,menakhos,menakhot,mncht,mnkht', 'Chulin:chulin,chullin,khulin,khullin,chl,khl,chln,khln', 'Bechoros:bechoros,bchoros,bechorot,bchorot,bcrt,bchrt,bkhrt,bc,bch,bkh', 'Erchin:erchin,erkhin,arachin,arakhin,ara,erc,erk', 'Temurah:temurah,tmurah,tmr', 'Kerisus:kerisus,krisus,keritut,kritut,kerisos,krisos,keritot,kritot,kerithoth,krithoth,kr,ker,krt,krs', 'Meilah:meilah,mei,ml', 'Nidah:nidah,niddah'], 
			searchType: { book: "tractate of Gemara", partPlural: "tractates" },
			displayName: function (name, match, isUntouched) { return name + " " + match[2] + (isUntouched ? match[3] : match[3].toLowerCase()); }
		});

		register("mt", (function () {
			var chabadMT = function (topic, chpt, mtmap) {
				var base = 'http://www.chabad.org/library/article_cdo/aid/',
					cid = mtmap[topic][2] + mtmap[topic][3][chpt];
				return base + cid;
			},

				mechonMamreMT = function (topic, chpt, law, mtmap) {
					chpt < 10 && (chpt = '0' + chpt);
					var res = mtmap[topic][0] + chpt + '.htm';
					law && (res += '#' + law);
					return 'http://www.mechon-mamre.org/i/' + res;
				};
			return {
				regex: /^([a-zA-Z'" .*_]{2,})(?:[;.,\s:]+(\d{1,2}))?(?:[;.,\s:\-]+(\d{1,2}))?$/i,
				link: function (topic, match, flags) {
					//key is topic name. 1st value is MM's topic id. 2nd is # of chpts. 3rd is Chabad.org's topic prefix. 4th (list) is Chabad.org's suffixes.
					var mtmap = {"De'ot": ['12', 7, '9103', ['14', '40', '42', '43', '44', '45', '46', '47']], "Chometz U'Matzah": ['35', 8, '937', ['298', '300', '301', '302', '303', '304', '305', '306', '307']], 'Zechiyah uMattanah': ['c2', 12, '136', ['2850', '5795', '5796', '5797', '5798', '5799', '5800', '5801', '5802', '5803', '5805', '5806', '5807']], "Tefillin, Mezuzah, v'Sefer Torah": ['23', 10, '925', ['369', '417', '423', '424', '425', '427', '428', '429', '430', '431', '432']], 'Avel': ['e4', 14, '11818', ['78', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95']], 'Gerushin': ['42', 13, '9577', ['04', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18']], "Kri'at Shema": ['21', 4, '91295', ['1', '2', '3', '4', '5']], "Me'ilah": ['89', 8, '10629', ['22', '28', '30', '31', '32', '33', '34', '35', '36']], 'Tefilah uBirkat Kohanim': ['22', 15, '9201', ['53', '61', '62', '65', '66', '67', '68', '69', '71', '72', '73', '74', '77', '78', '79', '80']], 'Bechorot': ['93', 8, '1062', ['867', '894', '895', '896', '897', '898', '899', '900', '901']], 'Naarah Besulah': ['44', 3, '96063', ['2', '4', '5', '6']], 'Kilaayim': ['71', 10, '9866', ['88', '90', '91', '92', '93', '94', '95', '96', '97', '98', '89']], 'Melachim uMilchamot': ['e5', 12, '11883', ['43', '45', '46', '47', '48', '49', '50', '52', '53', '54', '55', '56', '57']], 'Sheluchin veShuttafin': ['c4', 10, '136', ['2852', '3711', '3712', '3723', '3760', '3786', '3791', '3792', '3793', '3796', '3799']], 'Megillah vChanukah': ['3a', 4, '95200', ['5', '6', '7', '8', '9']], 'Eruvin': ['32', 8, '935', ['286', '300', '303', '304', '306', '307', '308', '309', '310']], 'Issurei Biah': ['51', 22, '9606', ['44', '47', '48', '49', '51', '52', '53', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70']], "To'en veNit'an": ['d4', 16, '11', ['52032', '52041', '52047', '52053', '52055', '52056', '52058', '67618', '67619', '67620', '68076', '68077', '68078', '68080', '68081', '68082', '68083']], 'Tzitzis': ['24', 3, '93634', ['0', '1', '2', '3']], 'Korban Pesach': ['91', 10, '10628', ['65', '74', '75', '80', '81', '82', '83', '84', '85', '86', '87']], 'Shevitat Yom Tov': ['34', 8, '9360', ['34', '35', '36', '37', '38', '39', '40', '41', '42']], 'Biat Hamikdash': ['83', 9, '10082', ['36', '42', '43', '44', '45', '46', '47', '48', '49', '50']], 'Issurei Mizbeiach': ['84', 7, '10082', ['39', '51', '52', '53', '54', '55', '56', '57']], 'Rotseah uShmirat Nefesh': ['b5', 13, '10889', ['16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29']], 'Temidin uMusafim': ['86', 10, '10132', ['52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62']], 'Shegagot': ['94', 15, '1062', ['868', '902', '903', '904', '905', '907', '908', '909', '911', '912', '913', '914', '915', '916', '917', '918']], "Tum'at Okhalin": ['a6', 16, '15253', ['71', '74', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95']], 'Yesodey HaTorah': ['11', 10, '9049', ['59', '60', '62', '69', '79', '80', '82', '91', '92', '93', '96']], 'Edut': ['e2', 22, '117', ['2722', '2769', '2770', '2771', '2772', '2773', '2774', '2775', '2776', '2777', '2778', '8799', '8800', '8801', '8802', '8803', '8804', '8805', '8806', '8807', '8808', '8809', '8810']], 'Terumot': ['73', 15, '9920', ['25', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41']], 'Teshuvah': ['15', 10, '911', ['887', '888', '891', '896', '898', '903', '905', '908', '910', '913', '914']], 'Nedarim': ['62', 13, '9738', ['79', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92']], "Ma'achalot Assurot": ['52', 17, '9682', ['55', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73']], 'Shekalim': ['37', 4, '9468', ['88', '89', '90', '91', '93']], 'Avadim': ['c5', 9, '136', ['2853', '3800', '2873', '3806', '3808', '3811', '3812', '3813', '3818', '3819']], 'Kelim': ['a7', 28, '1525', ['573', '793', '794', '795', '796', '797', '798', '799', '800', '801', '802', '803', '815', '817', '818', '819', '820', '821', '822', '823', '824', '825', '826', '827', '829', '831', '832', '833', '834']], "Tum'at Tsara'at": ['a3', 16, '1524', ['492', '493', '497', '500', '502', '507', '510', '511', '514', '516', '517', '518', '521', '523', '524', '527', '530']], 'Nezirut': ['63', 10, '9835', ['84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94']], 'Seder HaTefilah': ['27', 5, '15080', ['40', '41', '42', '43', '44', '45']], 'Pesulei Hamukdashim': ['87', 19, '10208', ['44', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65']], "Shofar, Sukkah, v'Lulav": ['36', 8, '946', ['093', '094', '095', '096', '097', '098', '099', '105', '106']], 'Maaserot': ['74', 14, '9970', ['69', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85']], 'Chagigah': ['92', 3, '10628', ['66', '88', '90', '93']], 'Maaser Sheini': ['75', 11, '9970', ['71', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96']], 'Sechirut': ['d1', 13, '13686', ['57', '62', '64', '66', '67', '68', '69', '70', '71', '72', '74', '75', '76', '77']], 'Mechussarey Kapparah': ['95', 5, '1062', ['862', '869', '870', '871', '919', '920']], 'Shechenim': ['53', 14, '13628', ['51', '55', '58', '59', '60', '61', '63', '64', '66', '67', '68', '69', '70', '71', '72']], 'Beis Habechirah': ['81', 8, '1007', ['192', '194', '195', '196', '197', '198', '199', '200', '193']], 'Mikvot': ['a8', 11, '15260', ['62', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75']], 'Shechitah': ['d2', 14, '9718', ['24', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40']], 'Avodat Yom HaKippurim': ['88', 5, '10629', ['21', '23', '24', '25', '26', '27']], 'Kli Hamikdash': ['82', 10, '10082', ['22', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35']], 'Ishut': ['41', 25, '952', ['873', '874', '875', '876', '878', '879', '880', '881', '882', '883', '884', '885', '886', '887', '888', '889', '890', '891', '892', '893', '894', '895', '896', '897', '899', '900']], 'Temurah': ['96', 4, '1061', ['798', '799', '844', '855', '857']], 'Shvuot': ['61', 12, '9738', ['61', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74']], 'Arachim vaCharamim': ['64', 8, '983', ['595', '596', '597', '598', '599', '600', '601', '602', '603']], 'Kiddush HaChodesh': ['38', 19, '9479', ['15', '18', '19', '20', '21', '22', '23', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '42', '43']], 'Mechirah': ['c1', 30, '136', ['2849', '3894', '3896', '3898', '3903', '3906', '3911', '3912', '3921', '3928', '3935', '3936', '3941', '3942', '3946', '3951', '3954', '3955', '3957', '3958', '3959', '3960', '3963', '3965', '3967', '3969', '3970', '3971', '3977', '3980', '3981']], 'Nehalot': ['d5', 11, '11705', ['29', '30', '31', '32', '33', '34', '35', '37', '38', '39', '40', '41']], 'Berachot': ['25', 11, '9276', ['47', '67', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79']], "Metamme'ey Mishkav uMoshav": ['a4', 13, '15245', ['32', '34', '35', '42', '44', '45', '46', '49', '78', '79', '80', '85', '87', '88']], "Tum'at Met": ['a1', 25, '1517', ['144', '151', '153', '161', '168', '169', '171', '172', '177', '186', '187', '188', '190', '192', '195', '200', '202', '204', '206', '218', '223', '228', '235', '236', '238', '241']], 'Shevitat Asor': ['33', 3, '93602', ['5', '6', '7', '8']], 'Talmud Torah': ['13', 7, '91', ['0970', '0973', '0974', '0975', '0977', '0979', '0980', '1561']], 'Malveh veLoveh': ['d3', 27, '11', ['59433', '59438', '59439', '59440', '59441', '59442', '59443', '59444', '59445', '59447', '59449', '59450', '59451', '59452', '59453', '59454', '59455', '61173', '61174', '61175', '61176', '61179', '61180', '61181', '61182', '61183', '61184', '61185']], "Sanhedrin veha'Onashin HaMesurin lahem": ['e1', 26, '11727', ['21', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49']], 'Mamrim': ['e3', 7, '11818', ['43', '52', '53', '54', '55', '56', '57', '58']], "Gezelah va'Avedah": ['b3', 18, '1088', ['884', '885', '886', '887', '888', '889', '890', '891', '892', '893', '894', '895', '896', '897', '898', '899', '900', '901', '902']], 'Shabbos': ['31', 30, '935', ['196', '197', '201', '202', '203', '204', '206', '207', '208', '210', '211', '218', '219', '221', '222', '223', '237', '238', '239', '240', '241', '242', '243', '244', '245', '247', '248', '249', '250', '251', '256']], 'Avodat Kochavim': ['14', 12, '9123', ['48', '59', '60', '61', '62', '63', '64', '65', '67', '68', '69', '70', '71']], 'Nizkei Mammon': ['b1', 14, '6829', ['65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '80']], "Ta'aniyot": ['39', 5, '95199', ['3', '5', '6', '7', '8', '9']], 'Chovel uMazzik': ['b4', 8, '10889', ['06', '08', '09', '10', '11', '12', '13', '14', '15']], 'Yibbum vChalitzah': ['43', 8, '9606', ['18', '19', '20', '21', '22', '23', '24', '25', '26']], "She'elah uFikkadon": ['c3', 8, '11520', ['77', '86', '87', '88', '89', '90', '91', '94', '96']], 'Milah': ['26', 3, '932', ['220', '325', '327', '330']], 'Shemita': ['77', 13, '10071', ['57', '61', '62', '64', '65', '67', '68', '70', '71', '73', '74', '76', '77', '78']], 'Bikkurim': ['76', 12, '10025', ['26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38']], 'Maaseh HaKorbanot': ['85', 19, '10170', ['09', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '48']], "She'ar Avot HaTum'ah": ['a5', 20, '15252', ['14', '16', '26', '29', '30', '31', '32', '34', '36', '37', '39', '40', '41', '43', '46', '47', '48', '49', '50', '53', '55']], 'Matnot Aniyiim': ['72', 10, '986', ['699', '702', '703', '704', '705', '706', '707', '708', '709', '710', '711']], 'Parah Adummah': ['a2', 15, '1517', ['250', '254', '255', '256', '259', '261', '264', '300', '304', '305', '308', '314', '319', '321', '323', '327']], 'Sotah': ['45', 4, '9606', ['37', '38', '39', '40', '41']], 'Genevah': ['b2', 9, '10888', ['54', '66', '68', '70', '72', '77', '73', '74', '75', '76']], 'Haggadah': ['35', 1, '94417', ['6']]
						},
						chpt = match[2] || 0, //if no chapter specfied, default to 0
						law = chpt && match[3] ? match[3] : '';

					chpt && (chpt = parseInt(chpt, 10)); //if chpt specified, convert to int
					law && (law = parseInt(law, 10)); //same for law

					if (chpt > mtmap[topic][1]) {
						return [false, '"' + chpt + '" is not a valid chapter for Hilchot ' + topic + '. \n\nThere are only ' + (mtmap[topic][1]) + ' chapters in Hilchot' + topic + '\n\nPlease try again.'];
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
	}());

	function repl(elem, type, force){
		var matches = reference(elem.value),
			res = elem.value,
			errors = false;
		$.each(matches, function(i, m){
			if (!m[1]) errors = true;
			m[1] && (res = res.replace(m[0][0], m[0][1] + m[2] + m[0][6]));
		});
		
		var msg = 'There are invalid references in your '+type+'. Are you sure you want to continue?';
		if (force || !errors || confirm(msg)){
			elem.value = res;
			$(elem).trigger('keydown');//hack to get highlights to refresh
			return true;
		}else{
			return false;
		}
	}
	
	function tHijack(elem){
		var pre = $('<pre>'+elem.value+'</pre>');
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
			'overflow-y':'hidden',
			})
			.css({padding:'+=1'});
		$(elem).after(pre);

		elem.id == 'input' && pre.css('padding','2px 4px');//different padding for chat
		
		$(elem).on('input focus mousemove scroll',function(){
			pre.css({width:$(elem).css('width'),height:$(elem).css('height')});//for resizing.
			pre.scrollTop($(elem).scrollTop());//for scrolling.
		});
		
		$(elem).on('input focus mousedown keydown', function(){
			var res = elem.value.replace(/[<>]/g, '`');//Prevent later parsing of any html in the textarea
			var matches = reference(elem.value),
				ids = [],
				r, cl, hl;
			$.each(matches, function(i, m){
				ids.push(['.grp'+i, m[2].replace(/\n/g, '<br>')]);
				r = m[0][2];
				cl = m[1] ? 'match' : 'error';
				hl = '<span class="'+cl+'"><span class="grp'+i+'">'+ r.match(/[\[a-zA-Z'\]]+|[0-9]+|[.,;:'*_ ]/g).join('</span>'+'<span class="grp'+i+'">') + '</span></span>';
				res = res.replace(m[0][0], m[0][1] + hl  + m[0][6]);
			});
			pre.html(res);
			$('.error').css('background-color','pink');
			$('.match').css('background-color','lightgreen');
			$.each(ids, function(i, id){
				$(id[0]).parent().data('msg', id[1]);
			});
		});
		
		$(elem).on('mouseout', function(e){
			$('#tt').remove();
		});
		
		$(elem).on('mousemove input', function tt(e){
			var b = false;
			$.each($('.error, .match'), function(i, m){
				//If Mouse is above the current element, go no further.
				if (e.pageY < $(m).offset().top) return false; 
				if (e.pageY < ($(m).offset().top + $(m).height())){
					$.each($(m).children(), function(i, g){
						var gOffset = $(g).offset(),
							gWidth  = $(g).width(),
							gHeight = $(g).height();
						if (e.pageX >= gOffset.left && e.pageX <= (gOffset.left + gWidth) && e.pageY > gOffset.top && e.pageY < (gOffset.top + gHeight)) {
							console.log('AAAH!! A MOUSE!!!');
							$('#tt').is('p') || $("body").append("<p id='tt'>"+ $(g).parent().data('msg') +"</p>");
							var t = $('#tt');
							t.css({
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
							if (t.height() + e.pageY > $(document).height()) {//if the tooltip runs below the page.
								t.css('top', ($(document).height() - t.height()) + (e.pageY - gOffset.top) - 20 + 'px');
							}else{
								t.css({top:(e.pageY - 10) + "px"});
							}
							b = true;
							return false;
						}
					});
				}
				if (b) return false;
			});
			!b && $("#tt").remove();
		});
	}
	
	$(document).on('focus', '[name="comment"]:not(.ref-hijacked)', function(){
		var tArea = $(this).addClass('ref-hijacked'),
			clonedArea = tArea.clone().attr('name', 'cmt-hij').val(tArea.val());//clone the textarea and change the clone's name to prevent conflicts. Add the textareas text to the clone, in case the comment's being edited.
		tArea.after(clonedArea).css({'display':'none'});//append the clone, and hide the original textarea 
		tHijack(clonedArea[0]);
		
		clonedArea.on('input keydown', function(){
			tArea.val($(this).val());
			repl(tArea[0], 'comment', true);
			tArea.trigger('keyup');//get charCounter to update.
		}).on('keypress', function(e){e.which == 13 && tArea.trigger('submit');});
		
		$(this).parents('form').data('events').submit.splice(0, 0, {handler:function(e){
			if (!repl(this[0], 'comment')) {
				e.stopImmediatePropagation();
				return false;
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
		
		var t = this;
		$(this).on('input focus', function(){
			var oldText = t.value, //save the old text
				start = t.selectionStart, //save the old cursor location
				end = t.selectionEnd;
			repl(t, '', true); //replace the text in the textarea, ignoring errors
			StackExchange.MarkdownEditor.refreshAllPreviews(); //refresh the hidden preview
			clonedPane.html(previewPane.clone(false).html()); //update the visible preview from the hidden one
			t.value = oldText; //and undo the textarea's text
			t.setSelectionRange(start, end); //and its cursor
			$(t).trigger('keydown');//hack to get highlights to refresh.
		});
		$(t).parents('form').data('events').submit.splice(0, 0, {handler : submit});
		function submit(e){
			var type = /\/questions\/ask/.test(window.location.pathname) && t.id == 'wmd-input' ? 'question' : 'answer';
			if (!repl(t, type)){
				e.stopImmediatePropagation();//prevent SE's bindings.
				return false;
			}
		}
	});
});
