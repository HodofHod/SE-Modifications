// ==UserScript==
// @name          Mi Yodeya Referencer
// @description   Links Biblical and Talmudic references to Chabad.org's online Tanach. (Formerly "SE Tanach Referencer")
// @match         http://stackoverflow.com/*
// @match         http://meta.stackoverflow.com/*
// @match         http://superuser.com/*
// @match         http://meta.superuser.com/*
// @match         http://serverfault.com/*
// @match         http://meta.serverfault.com/*
// @match         http://askubuntu.com/*
// @match         http://meta.askubuntu.com/*
// @match         http://answers.onstartups.com/*
// @match         http://meta.answers.onstartups.com/*
// @match         http://stackapps.com/*
// @match         http://*.stackexchange.com/*
// @exclude       http://api.*.stackexchange.com/*
// @exclude       http://data.stackexchange.com/*
// @exclude       http://*/reputation
// @author        @HodofHod   
// @namespace     HodofHod
// @version       2.4
// ==/UserScript==


/* 
Credits:        
@TimStone for the inject() function and some stray bits
@Menachem for the Chabad.org and Mechon Mamre links, and for all the debugging help
Joel Nothman and bibref.hebtools.com's spellings, which I pruned and modded.

ABANDON ALL HOPE, YE WHO LIKE WELL-WRITTEN CODE. y'know. with standards 'n stuff. (
Are there even standards for JavaScript? Oh well.)

Quick map: 
inject() injects the code into the page

refhijack() is called for each textarea, and calls the replace functions:

tlink(), glink(), and mtlink() are the functions that identify tanach, gemara, and mishna torah 
references, respectively. They call the below functions to generate the URL before substituting it.

chabadT(), chabadMT(), mechonMamreT(), mechonMamre() generate the URLs, and pass them back to 
their linking functions. glink() does its URLs in-house for now.

search() is a special function for mishan torah that performs a regex-based search for the 
inputted reference. Eventually be"H, it will be extended to do the searching for tlink() and 
glink() as well.
*/

function inject() { //Inject the script into the document
    for (var i = 0; i < arguments.length; ++i) {
        if (typeof (arguments[i]) == 'function') {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.textContent = '(' + arguments[i].toString() + ')(jQuery)';
            document.body.appendChild(script);
        }
    }
}

inject(function ($) {
    function refhijack(t) {
        var textarea = t.addClass('ref-hijacked')[0];//add an extra class. Why? No idea. Ask @TimStone, it's his fault
        t.focusout(function () { //when you click away, I pounce!
            tlink(textarea);  //check for Tanach links
            glink(textarea);  //check for Gemara links
            mtlink(textarea); //check for Mishna Torah links
            StackExchange.MarkdownEditor.refreshAllPreviews(); //refresh the Q's & A's preview panes
        });
    }

    function glink(t) {
        var spellings = [['Brachos', 'berachos', 'berachot', 'brachos', 'brachot', 'ber', 'bra', 'brcht', 'brchs', 'br'], ['Shabbos', 'shabbos', 'shabbat', 'shabbas', 'shabos', 'shabat', 'shbt', 'shbs', 'shab', 'sha'], ['Eruvin', 'eruvin', 'eiruvin', 'eru', 'eir', 'ervn', 'er'], ['Pesachim', 'pesachim', 'psachim', 'pesakhim', 'psakhim', 'pes', 'psa', 'pschm', 'ps'], ['Shekalim', 'shekalim', 'shekolim', 'shkalim', 'shkolim', 'shk', 'shek'], ['Yoma', 'yoma', 'yuma', 'yum', 'yom', 'ym'], ['Succah', 'succah', 'succa', 'sukkah', 'sukka', 'suka', 'sukah', 'sk', 'suk', 'suc', 'sc'], ['Beitzah', 'beitzah', 'beitza', 'betzah', 'betza', 'bei', 'bet', 'btz', 'be', 'btz'], ['Rosh Hashanah', 'rosh', 'hashana', 'ros', 'rsh', 'rh', 'ro', 'rsh'], ['Taanis', 'taanis', 'taanit', 'taanith', 'tanit', 'tanith', 'tanis', 'tan', 'tns', 'tn', 'taa', 'ta'], ['Megilah', 'megilah', 'megila', 'meg', 'mgl', 'mg'], ['Moed Katan', 'moedkatan', 'moe', 'md', 'mk'], ['Chagigah', 'chagigah', 'chagiga', 'cha', 'chag', 'chg'], ['Yevamos', 'yevamos', 'yevamot', 'yevamoth', 'yev', 'yvm', 'yvms', 'yvmt', 'yv'], ['Kesuvos', 'kesuvos', 'kesubos', 'kesubot', 'ketubot', 'ketuvot', 'ksuvos', 'ksubos', 'ket', 'kes', 'ksvs', 'ksvt', 'ktbt', 'ks', 'kt'], ['Nedarim', 'nedarim', 'ned', 'ndrm', 'ndr', 'ne'], ['Nazir', 'nazir', 'nozir', 'naz', 'noz', 'nzr', 'nz'], ['Sotah', 'sotah', 'sota', 'sot', 'so', 'st'], ['Gitin', 'gitin', 'gittin', 'git', 'gtn', 'gt'], ['Kiddushin', 'kiddushin', 'kidushin', 'kid', 'ki', 'kds', 'kdshn', 'kdsh', 'kd'], ['Bava Kama', 'bavakama', 'babakama', 'bavakamma', 'bk', 'bkama'], ['Bava Metzia', 'bavametzia', 'bavametziah', 'babametziah', 'babametzia', 'bm', 'bmetzia', 'bmetziah'], ['Bava Basra', 'bavabasra', 'bavabatra', 'bababatra', 'bavabatrah', 'bb', 'bbatra', 'bbasra', 'bbatrah', 'bbasrah'], ['Sanhedrin', 'sanhedrin', 'san', 'sa', 'sn', 'snh', 'snhd', 'snhdrn'], ['Makkos', 'makkos', 'makos', 'makkot', 'makot', 'ma', 'mak', 'mkt'], ['Shevuos', 'shevuos', 'shevuot', 'shavuot', 'shavuos', 'shv', 'shvt', 'shvs', 'shvuot', 'shvuos'], ['Avoda Zarah', 'avodazarah', 'avodazara', 'avodahzara', 'avodahzarah', 'avoda', 'avodah', 'az', 'avd', 'avo', 'avod', 'av'], ['Horayos', 'horayos', 'horaiot', 'horaios', 'horayot', 'horaot', 'ho', 'hor', 'hrs', 'hrt', 'hr'], ['Zevachim', 'zevachim', 'zevakhim', 'zev', 'zv', 'zvchm', 'zvkhm'], ['Menachos', 'menachos', 'menachot', 'menakhos', 'menakhot', 'men', 'mn', 'mncht', 'mnkht'], ['Chulin', 'chulin', 'chullin', 'khulin', 'khullin', 'chu', 'khu', 'chl', 'khl', 'chln', 'khln'], ['Bechoros', 'bechoros', 'bchoros', 'bechorot', 'bchorot', 'bec', 'bech', 'bek', 'bekh', 'bcrt', 'bchrt', 'bkhrt', 'bc', 'bch', 'bkh'], ['Erchin', 'erchin', 'erkhin', 'arachin', 'arakhin', 'ara', 'erc', 'erk'], ['Temurah', 'temurah', 'temura', 'tmurah', 'tmura', 'tem', 'tm', 'tmr'], ['Kerisus', 'kerisus', 'krisus', 'keritut', 'kritut', 'kerisos', 'krisos', 'keritot', 'kritot', 'kerithoth', 'krithoth', 'kr', 'ker', 'krt', 'krs'], ['Meilah', 'meilah', 'meila', 'mei', 'ml'], ['Nidah', 'nidah', 'nida', 'niddah', 'nidda', 'ni', 'nid']
    		],
            mesechtos = {'Chulin': [31, 141], 'Eruvin': [3, 104], 'Horayos': [28, 13], 'Rosh Hashanah': [9, 34], 'Shekalim': [5, 22], 'Menachos': [30, 109], 'Megilah': [11, 31], 'Bechoros': [32, 60], 'Brachos': [1, 63], 'Gitin': [19, 89], 'Taanis': [10, 30], 'Moed Katan': [12], 'Beitzah': [8, 39], 'Bava Kama': [21, 118], 'Kesuvos': [15, 111], 'Sanhedrin': [24, 112], 'Nazir': [17, 65], 'Kiddushin': [20, 81], 'Pesachim': [4, 120], 'Bava Basra': [23, 175], 'Sotah': [18, 48], 'Bava Metzia': [22, 118], 'Yoma': [6, 87], 'Succah': [7, 55], 'Meilah': [36, 21], 'Shabbos': [2, 156], 'Erchin': [33, 33], 'Nedarim': [16, 90], 'Shevuos': [26, 48], 'Temurah': [34, 33], 'Kerisus': [35, 27], 'Zevachim': [29, 119], 'Makkos': [25, 23], 'Avoda Zarah': [27, 75], 'Nidah': [37, 72], 'Chagigah': [13, 26], 'Yevamos': [14, 122]
			};

        var reg = /(\(|\s|^)\[(?:ref|g)[;,. :-]([\w' ]{2,}?)[.]?[;., :-](\d{1,3})([ab])([;., :-][lte]{0,3})?\]($|[\s,.;:\)])/mig,
            match;
        while ((match = reg.exec(t.value)) !== null) {
            var mes = match[2],
                page = match[3],
                side = match[4],
                flags = match[5] || '',
                pre = match[1] || '',
                suf = match[6] || '',
                found = false,
                res = null;

            mes = mes.toLowerCase().replace(/[' ]/g, '');
            flags = flags.toLowerCase();
            for (var i = 0; i < spellings.length; i++) {
                if ($.inArray(mes, spellings[i]) > -1) {
                    mes = spellings[i][0];
                    found = true;
                    break;
                }
            }
            if (!found) { //mesechta name not recognized
                alert("We're sorry; We couldn't find the tractate you were trying to link to. The text you entered (" + '"' + match[2] + '"' + ") was not recognized by our system. This might be because you're using a spelling or an abbreviation that isn't in our system yet. \n\nIf you'd like to add this spelling, you can ping @HodofHod in this chat room and he'll look into it: \nhttp://chat.stackexchange.com/rooms/9434");
                continue; //skip to the next gemara match
            } else {
                if (parseInt(page, 10) > mesechtos[mes][1] || page == '1' || page == '0') { //if mesechta doesn't have that page
                    alert('"' + page + side + '"' + 'is not a valid page for Mesechtas ' + mes +'. Please try again.');
                    continue; //skip to the next gemara match
                }
                if (side == 'a') { //hebrewbooks is weird.
                    res = 'http://hebrewbooks.org/shas.aspx?mesechta=' + mesechtos[mes][0] + '&daf=' + page;
                } else {
                    res = 'http://hebrewbooks.org/shas.aspx?mesechta=' + mesechtos[mes][0] + '&daf=' + page + side;
                }
                if (flags.indexOf('t') !== -1) { //text version flag is set
                    res = res + '&format=text';
                } else {
                    res = res + '&format=pdf';
                }
                if (flags.indexOf('l') !== -1) { //link title flag is set
                    res = '[' + mes + ' ' + page + side + '](' + res + ')';
                }
                t.value = t.value.replace(match[0], pre + res + suf);
            }
        }
    }

    function tlink(t) {
        var spellings = [
            ['Divrei Hayamim I', 'div1', 'dh1', 'chron1', '1chronicles', '1ch', '1chr', '1chron', '1ch', '1chr', '1chron', '1chronicles', '1stchronicles', 'ch1', 'chr1', 'chr1', 'chronicles1', 'chroniclesi', 'cr1', 'cr1', 'divreihayamim1', 'firstchronicles', 'ich', 'ichr', 'ichron', 'ichronicles', 'divreihayamimi'],
            ['Melachim I', 'mel1', '1kings', '1kgs', '1ki', '1k', '1kg', '1kgs', '1ki', '1kin', '1kings', '1stkgs', '1stkings', 'firstkgs', 'firstkings', 'ikgs', 'iki', 'ikings', 'ki1', 'kings1', 'kingsi', 'kings1', 'melachim1', 'mlachim1', 'mlachima', 'melachimi'],
            ['Divrei Hayamim II', 'div2', 'dh2', 'chron2','2chronicles', '2ch', '2chr', '2chron', '2ch', '2chr', '2chron', '2chronicles', '2ndchronicles', 'ch2', 'chr2', 'chr2', 'chronicles2', 'chroniclesii', 'cr2', 'cr2', 'divreihayamim2', 'iich', 'iichr', 'iichron', 'iichronicles', 'secondchronicles', 'divreihayamimii'],
            ['Melachim II', 'mel2', '2kings', '2kgs', '2ki', '2k', '2kg', '2kgs', '2ki', '2kin', '2kings', '2ndkgs', '2ndkings', 'iikgs', 'iiki', 'iikings', 'ki2', 'kings2', 'kingsii', 'kings2', 'melachim2', 'mlachim2', 'mlachimb', 'secondkgs', 'secondkings', 'melachimii'],
            ['Bereishit', 'genesis', 'ber', 'beraishis', 'beraishit', 'berayshis', 'bereishis', 'bereishit', 'braishis', 'braishit', 'brayshis', 'brayshit', 'breishis', 'breishit', 'ge', 'gen', 'geneza', 'gn', 'bre', 'bereshit'],
            ['Yirmiyahu', 'jeremiah', 'je', 'jer', 'jeremia', 'jeremija', 'jr', 'yeremiya', 'yeremiyah', 'yeremiyahu', 'yirmiyahu'],
            ['Michah', 'micah', 'mch', 'mi', 'mic', 'mich', 'micha', 'mih', 'miha', 'miq', 'michah'],
            ['Rus', 'ruth', 'rt', 'rth', 'ru', 'rut', 'ruta', 'rus'],
            ['Shemot', 'exodus', 'ex', 'exd', 'exo', 'exod', 'sh', 'shemot', 'shm', 'shmot', 'shemos', 'shmos'],
            ['Vayikra', 'leviticus', 'lb', 'le', 'leu', 'lev', 'lv', 'vay', 'vayikra', 'vayiqra', 'vayyikra', 'vayyiqra'],
            ['Bamidbar', 'numbers', 'bamidbar', 'bmidbar', 'br', 'nb', 'nm', 'nomb', 'nu', 'num'],
            ['Devarim', 'deuteronomy', 'de', 'deu', 'deut', 'deuteronomio', 'deuteronomium', 'dev', 'devarim', 'dt'],
            ['Yehoshua', 'joshua', 'ios', 'jos', 'josh', 'josua', 'joz', 'jsh', 'yehoshua', 'yoshua'],
            ['Shoftim', 'judges', 'jud', 'jdg', 'jdgs', 'jg', 'jt', 'judg', 'jue', 'jug', 'juges', 'shofetim', 'shoftim'],
            ['Shmuel I', 'shm1', '1samuel', '1s', '1sa', '1sam', '1shmuel', '1sm', '1s', '1sa', '1sam', '1samuel', '1sm', '1stsamuel', 'firstsamuel', 'isa', 'isam', 'isamuel', 'sa1', 'sa1', 'sam1', 'sam1', 'samuel1', 'samueli', 'samuel1', 'shmuel1', 'shmuela', 'shmueli'],
            ['Shmuel II', 'shm2', '2samuel', '2s', '2sa', '2sam', '2shmuel', '2sm', '2ndsamuel', '2s', '2sa', '2sam', '2samuel', '2sm', 'iisa', 'iisam', 'iisamuel', 'sa2', 'sa2', 'sam2', 'sam2', 'samuel2', 'samuelii', 'samuel2', 'secondsamuel', 'shmuel2', 'shmuelb', 'shmuelii'],
            ['Yeshayahu', 'isaiah', 'isiah', 'is', 'isa', 'yeshaya', 'yeshayah', 'yeshayahu'],
            ['Yechezkel', 'ezekiel', 'ez', 'eze', 'ezec', 'ezek', 'ezekial', 'ezk', 'hes', 'yechezkel', 'yecheskel', ''],
            ['Hoshea', 'hosea', 'ho', 'hos', 'hoshea', 'hosea'],
            ['Yoel', 'joel', 'ioel', 'jl', 'joe', 'jol', 'yoel'],
            ['Amos', 'amos', 'am', 'amo', 'ams'],
            ['Ovadiah', 'obadiah', 'ab', 'abd', 'abdija', 'ob', 'oba', 'obad', 'obadija', 'obadja', 'obd', 'ovadia', 'ovadiah', 'ovadya', 'ovadyah'],
            ['Yonah', 'jonah', 'ion', 'jna', 'jnh', 'jon', 'jona', 'yona', 'yonah'],
            ['Nachum', 'nahum', 'na', 'nachum', 'nah', 'naham', 'nam'],
            ['Chavakuk', 'habakkuk', 'ha', 'hab', 'habacuc', 'habakuk', 'habaqquq', 'habaquq', 'chavakuk'],
            ['Tzefaniah', 'zephaniah', 'sef', 'sefanja', 'sof', 'sofonija', 'soph', 'tsefania', 'tsephania', 'tzefaniah', 'tzephaniah', 'zef', 'zefanija', 'zefanja', 'zep', 'zeph', 'zephanja', 'zp', 'zp'],
            ['Chaggai', 'haggai', 'hag', 'hagai', 'hagg', 'haggay', 'hg', 'hgg', 'chagai', 'chaggai'],
            ['Zechariah', 'zechariah', 'sach', 'sacharja', 'za', 'zac', 'zach', 'zacharia', 'zah', 'zaharija', 'zc', 'zch', 'zec', 'zech', 'zecharia', 'zecharya', 'zekhariah'],
            ['Malachi', 'malachi', 'mal', 'malahija', 'malakhi', 'maleachi', 'ml'],
            ['Tehillim', 'psalms', 'ps', 'psa', 'psalm', 'psalmen', 'psalmi', 'psg', 'pslm', 'psm', 'pss', 'sal', 'salmos', 'sl', 'tehilim', 'tehillim', 'thilim', 'thillim'],
            ['Mishlei', 'proverbs', 'mishlei', 'mishley', 'pr', 'pro', 'prou', 'prov', 'prv'],
            ['Iyov', 'job', 'hi', 'hiob', 'ijob', 'iob', 'iyov', 'iyyov', 'jb'],
            ['Shir HaShirim', 'songs', 'songofsolomon', 'sgs', 'sng', 'sol', 'song', 'songofsongs', 'songofsolomon', 'sos', 'ss', 'so', 'songofsongs', 'shir', 'shirhashirim'],
            ['Eichah', 'lamentations', 'aicha', 'aichah', 'eicha', 'eichah', 'eikha', 'eikhah', 'la', 'lam', 'lamentaciones', 'lm'],
            ['Kohelet', 'ecclesiastes', 'ec', 'ecc', 'eccl', 'eccles', 'ecl', 'koh', 'koheles', 'kohelet', 'qo', 'qoh', 'qohelet', 'qoheleth', 'qohleth'],
            ['Esther', 'esther', 'est', 'ester', 'estera', 'esth'],
            ['Daniel', 'daniel', 'da', 'dan', 'dn'],
            ['Ezra', 'ezra', 'esr', 'esra', 'ezr'],
            ['Nechemiah', 'nehemiah', 'ne', 'nechemiah', 'neh', 'nehemia', 'nehemija', 'nehemyah']
        ];
        //Keys are book names (duh) first value is chapter 1's id for chabad.org. 2nd value is number fo chapters
        //Third value is Mechon Mamre's book id
        var map = {'Tzefaniah': [16200, 3, '21'], 'Hoshea': [16155, 14, '13'], 'Nachum': [16194, 3, '19'], 'Michah': [16187, 7, '18'], 'Shoftim': [15809, 21, '07'], 'Melachim II': [15907, 25, '09b'], 'Tehillim': [16222, 150, '26'], 'Nechemiah': [16508, 13, '35b'], 'Kohelet': [16462, 12, '31'], 'Yirmiyahu': [15998, 52, '11'], 'Amos': [16173, 9, '15'], 'Zechariah': [16205, 14, '23'], 'Melachim I': [15885, 22, '09a'], 'Divrei Hayamim II': [16550, 36, '25b'], 'Shmuel I': [15830, 31, '08a'], 'Yeshayahu': [15932, 66, '10'], 'Shmuel II': [15861, 24, '08b'], 'Yonah': [16183, 4, '17'], 'Rus': [16453, 4, '29'], 'Shir HaShirim': [16445, 8, '30'], 'Vayikra': [9902, 27, '03'], 'Ezra': [16498, 10, '35a'], 'Esther': [16474, 10, '33'], 'Yehoshua': [15785, 24, '06'], 'Yechezkel': [16099, 48, '12'], 'Iyov': [16403, 42, '27'], 'Divrei Hayamim I': [16521, 29, '25a'], 'Mishlei': [16372, 31, '28'], 'Daniel': [16484, 12, '34'], 'Devarim': [9965, 34, '05'], 'Yoel': [16169, 4, '14'], 'Chavakuk': [16197, 3, '20'], 'Bamidbar': [9929, 36, '04'], 'Chaggai': [16203, 2, '22'], 'Shemot': [9862, 40, '02'], 'Malachi': [16219, 3, '24'], 'Bereishit': ['', 50, '01'], 'Eichah': [16457, 5, '32'], 'Ovadiah': [16182, 1, '16']
        };

        var reg = /(\(|\s|^)\[(?:ref|t)[;,. :-]([\w' ]{2,}?)[.]?[;., :-](\d{1,2})([;., :-]\d{1,3})?([;., :-][lrm]{0,3})?\]($|[\s,.;:\)])/mig, //abandon all hope, ye who enter here!
            match;

        while ((match = reg.exec(t.value)) !== null) { //as long as there's another regex match to be found
            var book = match[2],
                chpt = match[3],
                vrs = match[4] || '',
                flags = match[5] || '',
                pre = match[1] || '',
                suf = match[6] || '',
                res = false,
                found = null;

            book = book.toLowerCase().replace(/[' ]/g, ''); //strip out spaces for matching purposes
            vrs = vrs.replace(/[;., :-]/g, ''); //strip out leading punctuation
            flags = flags.toLowerCase(); //more matching purposes
            if (chpt == '0') { //If the chapter number is 0, then someone's trying to cheat me!
                alert('"0" is not a valid chapter number. Please try again.');
                return false;
            }
            for (var i = 0; i < spellings.length; i++) { //iterate through all the spellings
                if ($.inArray(book, spellings[i]) > -1) { //to check if the regexed book name is there
                    book = spellings[i][0]; //changes `book` to the full, capitalized, book title
                    found = true;
                    break;
                }
            }
            if (!found) { //in case the for loop finishes without matching a book. 
                alert("We're sorry; We couldn't find the book you were trying to link to. The text you entered (" + '"' + match[2] + '"'  + ") was not recognized by our system. This might be because you're using a spelling or an abbreviation that isn't in our system yet. \n\nIf you'd like to add this spelling, you can ping @HodofHod in this chat room and he'll look into it: \nhttp://chat.stackexchange.com/rooms/9434");
                continue; //And because there's no for{}else{} syntax in js.
            }

            if (flags.indexOf('m') !== -1) { //Mechon Mamre flag is set
                res = mechonMamreT(book, chpt, vrs, flags, map);
            } else { //Default to Chabad.org
                res = chabadT(book, chpt, vrs, flags, map);
            }
            if (res) { //If chabad() or mechonMamre() returned a value, then replace the stuff.
                if (flags.indexOf('l') !== -1) { //if link flag is set..
                    if (vrs) { //if verse has been specified
                        vrs = ':' + vrs; //vrs has already been added to the url
                    } //so now a : is added so the title looks pretty
                    var title = '[' + book + ' ' + chpt + vrs + ']';
                    res = title + '(' + res + ')';
                }
                t.value = t.value.replace(match[0], pre + res + suf);
            }
        }
        return;
    }

    function mechonMamreT(book, chpt, vrs, flags, map) {
        var url = null,
            cid = null;

        if (parseInt(chpt, 10) > map[book][1]) { //Stop trying to sneak fake chapters in, aright?
            alert('"' + chpt + '" is not a valid chapter for ' + book +'. \n\nThere are only ' + map[book][1] + 'chapters in ' + book + '\n\nPlease try again.');
            return false;
        }
        if (chpt < 10) { //Mechon Mamre likes all their chapter ids to be two digits, and everyone else can go fayfn.
            cid = '0' + chpt;
        } else if (chpt > 99) {
            //mechon mamre (zol zayn gezunt un shtark) has an annoying way of shortening 3-digit chapter 
            //numbers into 2 digit string+number combos. I.e., 100 = a0, 101 = a1, 110 = b0, etc.,
            //So! Take a 3-digit number as a string, and convert the middle character to an int, 
            //then convert that into a letter using a unicode number map, then prepend that to 
            //the third character of the 3-digit number-string, and that becomes the chapter id 
            //string to add to the url.
            cid = String.fromCharCode(97 + parseInt(chpt.charAt(1), 10)) + chpt.charAt(2);
        } else {
            cid = chpt; //if it's a 2-digit number then shalom al yisroel
        }
        url = 'http://www.mechon-mamre.org/p/pt/pt' + map[book][2] + cid + '.htm';
        if (vrs) { //if verse is specified in the reference
            url += '#' + vrs;
        }
        return url;

    }

    function chabadT(book, chpt, vrs, flags, map) {
        var ber = //Bereishis' chapter ids are not sequential. See below.
        [8165, 8166, 8167, 8168, 8169, 8171, 8170,
        8172, 8173, 8174, 8175, 8176, 8208, 8209,
        8210, 8211, 8212, 8213, 8214, 8215, 8216,
        8217, 8218, 8219, 8220, 8221, 8222, 8223,
        8224, 8225, 8226, 8227, 8228, 8229, 8230,
        8231, 8232, 8233, 8234, 8235, 8236, 8237,
        8238, 8239, 8240, 8241, 8242, 8243, 8244, 8245];

        var cid = null,
            url = null;

        if (book == "Bereishit") { //Chabad.org's chapter ids are sequential for each book besides Bereishis. So it gets special treatment. As if it was the youngest child or something
            if (chpt > ber.length) { //STOP IT! I'm warning you!
                alert('"' + chpt + '" is not a valid chapter for Bereishit. \n\nThere are only 50 chapters in Bereishit. \n\nPlease try again.');
                return false;
            }
            cid = ber[chpt - 1];
        } else { //Everybody else, eat your vegetables!
            chpt = parseInt(chpt, 10);
            if (chpt > map[book][1]) { //Now you've done it!
                alert('"' + chpt + '" is not a valid chapter for ' + book +'. \n\nThere are only ' + map[book][1] + 'chapters in ' + book + '\n\nPlease try again.');
                blowUp(computer); //because, why not?
                return false; //for good measure.
            }
            cid = map[book][0] + chpt - 1;
        }
        url = 'http://www.chabad.org/library/bible_cdo/aid/' + cid;
        if (flags.indexOf('r') !== -1) { //Rashi flag is set?
            url += "#showrashi=true";
        }
        if (vrs) { //Verse is specified?
            if (flags.indexOf('r') !== -1) {//rashi is _also_ specified
                url += '&v=' + vrs;
            }else{ //just verse, then.
                url += '#v=' + vrs;
            }
        }
        return url; //Then we're ready to rummmmmmbbblleee.....
    }

    function mtlink(t) {
        var spellings = ['Yesodey HaTorah:yesodey,yesodei,yesode,yisodei,yisode,yisodey,yesodey,hatorah,torah,hatora,tora,yht,yt,yes,yis', "De'ot:deot,deos,deyos,deios,deyot,deiot,daot,daos", 'Talmud Torah:talmud,torah,tora,tt,tal', 'Avodat Kochavim:avodah,hagoyim,avodat,avodas,kochavim,chukot,chukos,goyim,goim,hagoyim,hagoim,ak,zara,zarah,chuk,goy,az', 'Teshuvah:teshuva,teshuvah,tshuvah,tshuva,tsh,tesh', "Kri'at Shema:krias,kriat,kriyat,kriyas,shema,shma,ks,krs,krsh", 'Tefilah and Birkat Kohanim:tefilah,tefila,tfila,tfilah,tefilla,tefillah,birkat,birkas,birchas,birchat,kohanim,cohanim,tbk', "Tefillin, Mezuzah, v'Sefer Torah:,tefillin,tefilin,tfilin,mezuzah,mezuza,mzuza,mzuzah,sefer,torah,tora,stam", 'Tzitzis:tzitzis,tzizit,tsitsit,tsitsis,sisis,sisit', 'Berachot:berachot,berachos,brachos,brachot', 'Milah:milah,mila,bris,brit', 'Seder HaTefilah:seder,siddur,sidur,hatefilah,hatefila,hatfilah,hatfila,tfila,tefila,tfilah,tefilah,tefilla,tefillah', 'Shabbos:shabbat,shabat,shabbos,shabes,shabbes,shab,sh', 'Eruvin:eruvin,eiruvin,eruv,er,eru', 'Shevitat Asor:shvisas,shevisas,shevitat,shvitat,asor', 'Shevitat Yom Tov:shvisas,shevisas,shevitat,shvitat,yomtov,yt,yom,tov', "Chometz U'Matzah:chametz,hametz,hamets,hamets,chamets,chometz,chometz,cham,ham,matza,massa,masa,matsa,matzo,chum,chom,cm", 'Haggadah:haggada,hagada,haggadah,hagadah', "Shofar: Sukkah, v'Lulav:,shofar,sukkah,succah,suka,sukah,sukka,succa,lulav", 'Shekalim:sheqalim,shekalim,shkalim,shekolim,shkolim,shek,shkolim', 'Kiddush HaChodesh:chodesh,hodesh,khodesh,hachodesh,hahodesh,hakhodesh,kidush,kiddush,kid,khc', "Ta'aniyot:taaniyos,taanios,taaniyot,taaniot,tanios,taniyos,taanis,taanit,tanis,tan,taan,taniyot", 'Megillah vChanukah:meg,mg,megila,mgila,megilla,megillah,chanukah,chanukkah,hanukah,hanukkah,hanuka,hanukka,chanuka,channuka,han,han,mgc,mgvch,mgch', 'Ishut:ishut,ishus,eshus', 'Gerushin:gerushin,geirushin,gittin,gitin', 'Yibbum vChalitzah:yibbum,yibum,chalitza,chalitzah,halitza,halitzah,haliza,chaliza,halizah,chalizah,halissa', 'Naarah Besulah:naarah,nara,naara,narah,betulah,besula,bsula,bsulah,besulah', 'Sotah:sota,sotah,soda', 'Issurei Biah:issurei,isurei,isure,isurey,issurey,bia,biah,biya,biyah,ib,isub', "Ma'achalot Assurot:maachalot,machalot,maachalos,machalos,assurot,asurot,assuros,asuros,ma,macha,maacha", 'Shechitah:shechitah,shechita,shehita,shehitah', 'Sechirut:sechirut,sechirus,sachir,schirus,schirut', "She'elah uFikkadon:sheailah,sheeilah,sheelah,shailah,shaylah,shayla,sheaila,fikkadon,pikadon,piqadon", 'Malveh veLoveh:malve,malveh,loveh,love', 'To`en veNit`an:toen,toain,nitan,nitaan', 'Nehalot:nachalos,nachlos,nachlot,nahalot,nahlot,nachalaos,nehalot', 'Kilaayim:kilaayim,kilaim,kil', 'Matnot Aniyiim:matanos,aniyim,tzedaka,mattanot,mattanos,matnot,matnos,aniyiim', 'Terumot:terumos,terumot,terum,ter', 'Maaserot:maaserot,maaseros,maaser,mayseros,maser,mayser,maas,mays', 'Maaser Sheini:maaser,maser,mayser,sheni,sheini,neta,revai,kerem,msvnr,msnr,ms', 'Bikkurim:bikkurim,bikurim,shar,shaar,matnot,matnos,matanos,matanot,kehuna,kehunah,shebgevulin,shebgvulin,bik,bikk', 'Shemita:shmita,shemitta,shemitah,shmitah,shmitta,yovel,yoivel,yoival,sy,shy', 'Shvuot:shvuot,shvuos,shevuos,shv,shevuot', 'Nedarim:neder,ned,ndr,nedarim', 'Nezirut:nazir,nezirus,nezerut,nezirus,nezirut,nez,naz,nz', 'Arachim vaCharamim:arachim,arachin,erkin,erchin,charamot,charamos,haramos,haramim,charamim,herem,cherem,ach,arch,arvch,charamin', 'Beis Habechirah:beit,beis,bet,bes,habechira,habechirah,habchira,habchirah,habekhira,habekhirah,bh', 'Kli Hamikdash:kli,klei,kley,hamikdash,hamikdosh,mikdash,mikdosh,ovdim,haovdim,bo,ba', 'Biat Hamikdash:biat,bias,mikdash,hamikdash,mikdosh,hamikdosh', 'Issurei Mizbeiach:issurei,isurei,issurey,isurey,isure,issure,mizbeiach,mizbeyach,mizbeyakh', 'Temidin uMusafim:tmidin,temidin,temidim,tmidim,tamidim,tamidin,tamid,musafin,musafim', 'Maaseh HaKorbanot:maseh,maaseh,mayseh,mayse,hakorbonos,hakorbanot,hakorbanos', 'Pesulei Hamukdashim:pesulei,psulei,pesuley,psulei,hamukdashim,mukdashim', 'Avodat Yom HaKippurim:avodat,avodas,avoidas,yom,hakippurim,hakipurim,kipurim,kippurim,kippur,kipur,ayk,yk', 'Me`ilah:meilah,meila', 'Sanhedrin veha`Onashin HaMesurin lahem:sanhedrin,haonshin,onshin,hamesurin,mesurin,lahem,sanhed', 'Edut:edus,edut,eduth,edhuth,eidim,eid', 'Mamrim:mamrim,mamrin', 'Avel:avel,uvel,aveilus,aveilut,avelut,avelus,aveluth', 'Melachim uMilchamot:melachim,melech,mashiach,melochim,mlochim,mlachim,milchamos,milchamot,milchomos,milchamteihem,milchamosehem,milchamoseihem,milchamotehem,milchamoteihem,milchomosehem,milchomoseihem,milhamotehem,milhamoteihem', 'Korban Pesach:korban,karban,pesah,pesach,pesakh', 'Chagigah:chagiga,chagigah,hagiga,hagigah', 'Bechorot:bechorot,bechoros,bchorot,bchoros', 'Shegagot:shegagot,shegagos,shgagot,shgagos', 'Mechussarey Kapparah:mechussarey,mechusarei,mechussarei,kapparah,kappara,kaparah,kapara,mk,mech', 'Temurah:temurah,temura,tmurah,tmura', "Tum'at Met:tumas,tumat,met,mes,meit,meis,mais,mait", 'Parah Adummah:para,parah,poro,poroh,aduma,adumah,adummah,adumma', "Tum'at Tsara`at:tumas,tumat,tzaraas,tzoras,tzaras,tzaraat,tzarat,tsarat,tsaraat", "Metamme'ey Mishkav uMoshav:metammey,metammeey,metammei,metamei,metamey,mtamei,mtamey,mishkav,mishkov,moshav,mmm", "She'ar Avot HaTum'ah:shear,shar,shaar,avot,avos,hatumah,hatuma,hatumaa,tumaa,tumah,sat", "Tum'at Okhalin:tumas,tumat,okhalin,ochalin,oichlin,oichlim,to", 'Kelim:keilim,kelim,kei,ke', 'Mikvot:mikvaot,mikvot,mikvos,mikvaos,mikvah,mik,mkv', 'Nizkei Mammon:nizkei,nizkey,niskei,niskey,nizke,mamon,mammon,mamoin,mumoin,nm,niz', 'Genevah:genevah,geneivah,geneva,geneiva,gneiva,gneva,gneivah,gnevah,gen,gne', "Gezelah va'Avedah:gezelah,gezeilah,gzeilah,gzelah,gzela,gezela,gezeila,gzeila,avedah,aveda,aveidah,aveida,ga,gva", 'Chovel uMazzik:chovel,choivel,choyvel,mazzik,mazik,chov', 'Rotseah uShmirat Nefesh:rotseach,rotzeach,rotseah,rotzeah,rotzeiach,shmirat,shmiras,shemirat,shemiras,nefesh,nafesh,rot,rotz,rusn,rsn', 'Mechirah:mechira,mechirah,mehira,mehirah,mchira,mchirah,mekhira,mekhirah,mech,mch', 'Zechiyah uMattanah:zechiyah,zechiyah,zekhiya,zekhiyah,zechia,zechiah,mattana,mattanah,matana,matanah,matanah,zech,zch,zm', 'Shechenim:shechenim,shekhenim,shehenim', 'Sheluchin veShuttafin:sheluchin,shluchin,sheluchim,shelukhin,shluchim,shuttafin,shutafin,shutfin,ss,svs', 'Avadim:avadim,avodim,av,avd'
		];
        var mtmap = {"De'ot": ['12', 7, ['910314', '910340', '910342', '910343', '910344', '910345', '910346', '910347']], 'Tefilah and Birkat Kohanim': ['22', 15, ['920153', '920161', '920162', '920165', '920166', '920167', '920168', '920169', '920171', '920172', '920173', '920174', '920177', '920178', '920179', '920180']], 'Shabbos': ['31', 30, ['935196', '935197', '935201', '935202', '935203', '935204', '935206', '935207', '935208', '935210', '935211', '935218', '935219', '935221', '935222', '935223', '935237', '935238', '935239', '935240', '935241', '935242', '935243', '935244', '935245', '935247', '935248', '935249', '935250', '935251', '935256']], 'Zechiyah uMattanah': ['c2', 12, ['1362850', '1365795', '1365796', '1365797', '1365798', '1365799', '1365800', '1365801', '1365802', '1365803', '1365805', '1365806', '1365807']], "Tefillin, Mezuzah, v'Sefer Torah": ['23', 10, ['925369', '925417', '925423', '925424', '925425', '925427', '925428', '925429', '925430', '925431', '925432']], 'Avel': ['e4', 14, ['1181878', '1181882', '1181883', '1181884', '1181885', '1181886', '1181887', '1181888', '1181889', '1181890', '1181891', '1181892', '1181893', '1181894', '1181895']], 'Gerushin': ['42', 13, ['957704', '957706', '957707', '957708', '957709', '957710', '957711', '957712', '957713', '957714', '957715', '957716', '957717', '957718']], "Kri'at Shema": ['21', 4, ['912951', '912952', '912953', '912954', '912955']], 'Sechirut': ['d1', 13, ['1368657', '1368662', '1368664', '1368666', '1368667', '1368668', '1368669', '1368670', '1368671', '1368672', '1368674', '1368675', '1368676', '1368677']], 'Bechorot': ['93', 8, ['1062867', '1062894', '1062895', '1062896', '1062897', '1062898', '1062899', '1062900', '1062901']], 'Naarah Besulah': ['44', 3, ['960632', '960634', '960635', '960636']], 'Temurah': ['96', 4, ['1061798', '1061799', '1061844', '1061855', '1061857']], 'Me`ilah': ['89', 8, ['1062922', '1062928', '1062930', '1062931', '1062932', '1062933', '1062934', '1062935', '1062936']], 'Melachim uMilchamot': ['e5', 12, ['1188343', '1188345', '1188346', '1188347', '1188348', '1188349', '1188350', '1188352', '1188353', '1188354', '1188355', '1188356', '1188357']], 'Sheluchin veShuttafin': ['c4', 10, ['1362852', '1363711', '1363712', '1363723', '1363760', '1363786', '1363791', '1363792', '1363793', '1363796', '1363799']], 'Megillah vChanukah': ['3a', 4, ['952005', '952006', '952007', '952008', '952009']], 'To`en veNit`an': ['d4', 16, ['1152032', '1152041', '1152047', '1152053', '1152055', '1152056', '1152058', '1167618', '1167619', '1167620', '1168076', '1168077', '1168078', '1168080', '1168081', '1168082', '1168083']], 'Issurei Biah': ['51', 22, ['960644', '960647', '960648', '960649', '960651', '960652', '960653', '960655', '960656', '960657', '960658', '960659', '960660', '960661', '960662', '960663', '960664', '960665', '960666', '960667', '960668', '960669', '960670']], 'Nizkei Mammon': ['b1', 14, ['682965', '682966', '682967', '682968', '682969', '682970', '682971', '682972', '682973', '682974', '682975', '682976', '682977', '682978', '682980']], 'Tzitzis': ['24', 3, ['936340', '936341', '936342', '936343']], 'Shevitat Yom Tov': ['34', 8, ['936034', '936035', '936036', '936037', '936038', '936039', '936040', '936041', '936042']], 'Sanhedrin veha`Onashin HaMesurin lahem': ['e1', 26, ['1172721', '1172724', '1172725', '1172726', '1172727', '1172728', '1172729', '1172730', '1172731', '1172732', '1172733', '1172734', '1172735', '1172736', '1172737', '1172738', '1172739', '1172740', '1172741', '1172742', '1172743', '1172744', '1172745', '1172746', '1172747', '1172748', '1172749']], 'Biat Hamikdash': ['83', 9, ['1008236', '1008242', '1008243', '1008244', '1008245', '1008246', '1008247', '1008248', '1008249', '1008250']], 'Issurei Mizbeiach': ['84', 7, ['1008239', '1008251', '1008252', '1008253', '1008254', '1008255', '1008256', '1008257']], 'Rotseah uShmirat Nefesh': ['b5', 13, ['1088916', '1088917', '1088918', '1088919', '1088920', '1088921', '1088922', '1088923', '1088924', '1088925', '1088926', '1088927', '1088928', '1088929']], 'Temidin uMusafim': ['86', 10, ['1013252', '1013253', '1013254', '1013255', '1013256', '1013257', '1013258', '1013259', '1013260', '1013261', '1013262']], 'Shegagot': ['94', 15, ['1062868', '1062902', '1062903', '1062904', '1062905', '1062907', '1062908', '1062909', '1062911', '1062912', '1062913', '1062914', '1062915', '1062916', '1062917', '1062918']], 'Avodat Kochavim': ['14', 12, ['912348', '912359', '912360', '912361', '912362', '912363', '912364', '912365', '912367', '912368', '912369', '912370', '912371']], 'Yesodey HaTorah': ['11', 10, ['904959', '904960', '904962', '904969', '904979', '904980', '904982', '904991', '904992', '904993', '904996']], 'Edut': ['e2', 22, ['1172722', '1172769', '1172770', '1172771', '1172772', '1172773', '1172774', '1172775', '1172776', '1172777', '1172778', '1178799', '1178800', '1178801', '1178802', '1178803', '1178804', '1178805', '1178806', '1178807', '1178808', '1178809', '1178810']], 'Terumot': ['73', 15, ['992025', '992027', '992028', '992029', '992030', '992031', '992032', '992033', '992034', '992035', '992036', '992037', '992038', '992039', '992040', '992041']], 'Teshuvah': ['15', 10, ['911887', '911888', '911891', '911896', '911898', '911903', '911905', '911908', '911910', '911913', '911914']], "Ma'achalot Assurot": ['52', 17, ['968255', '968257', '968258', '968259', '968260', '968261', '968262', '968263', '968264', '968265', '968266', '968267', '968268', '968269', '968270', '968271', '968272', '968273']], 'Shekalim': ['37', 4, ['946888', '946889', '946890', '946891', '946893']], 'Avadim': ['c5', 9, ['1362853', '1363800', '1362873', '1363806', '1363808', '1363811', '1363812', '1363813', '1363818', '1363819']], 'Kelim': ['a7', 28, ['1525573', '1525793', '1525794', '1525795', '1525796', '1525797', '1525798', '1525799', '1525800', '1525801', '1525802', '1525803', '1525815', '1525817', '1525818', '1525819', '1525820', '1525821', '1525822', '1525823', '1525824', '1525825', '1525826', '1525827', '1525829', '1525831', '1525832', '1525833', '1525834']], "She'elah uFikkadon": ['c3', 8, ['1152077', '1152086', '1152087', '1152088', '1152089', '1152090', '1152091', '1152094', '1152096']], 'Nezirut': ['63', 10, ['983584', '983585', '983586', '983587', '983588', '983589', '983590', '983591', '983592', '983593', '983594']], 'Shofar, Sukkah, vLulav': ['36', 8, ['946093', '946094', '946095', '946096', '946097', '946098', '946099', '946105', '946106']], 'Pesulei Hamukdashim': ['87', 19, ['1020844', '1020847', '1020848', '1020849', '1020850', '1020851', '1020852', '1020853', '1020854', '1020855', '1020856', '1020857', '1020858', '1020859', '1020860', '1020861', '1020862', '1020863', '1020864', '1020865']], "Tum'at Met": ['a1', 25, ['1517144', '1517151', '1517153', '1517161', '1517168', '1517169', '1517171', '1517172', '1517177', '1517186', '1517187', '1517188', '1517190', '1517192', '1517195', '1517200', '1517202', '1517204', '1517206', '1517218', '1517223', '1517228', '1517235', '1517236', '1517238', '1517241']], "Gezelah va'Avedah": ['b3', 18, ['1088884', '1088885', '1088886', '1088887', '1088888', '1088889', '1088890', '1088891', '1088892', '1088893', '1088894', '1088895', '1088896', '1088897', '1088898', '1088899', '1088900', '1088901', '1088902']], 'Chagigah': ['92', 3, ['1062866', '1062888', '1062890', '1062893']], 'Maaser Sheini': ['75', 11, ['997071', '997086', '997087', '997088', '997089', '997090', '997091', '997092', '997093', '997094', '997095', '997096']], 'Eruvin': ['32', 8, ['935286', '935300', '935303', '935304', '935306', '935307', '935308', '935309', '935310']], 'Mechussarey Kapparah': ['95', 5, ['1062862', '1062869', '1062870', '1062871', '1062919', '1062920']], 'Shechenim': ['53', 14, ['1362851', '1362855', '1362858', '1362859', '1362860', '1362861', '1362863', '1362864', '1362866', '1362867', '1362868', '1362869', '1362870', '1362871', '1362872']], 'Bikkurim': ['76', 12, ['1002526', '1002527', '1002528', '1002529', '1002530', '1002531', '1002532', '1002533', '1002534', '1002535', '1002536', '1002537', '1002538']], 'Shechitah': ['d2', 14, ['971824', '971827', '971828', '971829', '971830', '971831', '971832', '971833', '971834', '971835', '971836', '971837', '971838', '971839', '971840']], 'Avodat Yom HaKippurim': ['88', 5, ['1062921', '1062923', '1062924', '1062925', '1062926', '1062927']], 'Kli Hamikdash': ['82', 10, ['1008222', '1008226', '1008227', '1008228', '1008229', '1008230', '1008231', '1008232', '1008233', '1008234', '1008235']], 'Seder HaTefilah': ['27', 5, ['1508040', '1508041', '1508042', '1508043', '1508044', '1508045']], "Tum'at Okhalin": ['a6', 16, ['1525371', '1525374', '1525381', '1525382', '1525383', '1525384', '1525385', '1525386', '1525387', '1525388', '1525389', '1525390', '1525391', '1525392', '1525393', '1525394', '1525395']], 'Korban Pesach': ['91', 10, ['1062865', '1062874', '1062875', '1062880', '1062881', '1062882', '1062883', '1062884', '1062885', '1062886', '1062887']], 'Matnot Aniyiim': ['72', 10, ['986699', '986702', '986703', '986704', '986705', '986706', '986707', '986708', '986709', '986710', '986711']], 'Arachim vaCharamim': ['64', 8, ['983595', '983596', '983597', '983598', '983599', '983600', '983601', '983602', '983603']], 'Mechirah': ['c1', 30, ['1362849', '1363894', '1363896', '1363898', '1363903', '1363906', '1363911', '1363912', '1363921', '1363928', '1363935', '1363936', '1363941', '1363942', '1363946', '1363951', '1363954', '1363955', '1363957', '1363958', '1363959', '1363960', '1363963', '1363965', '1363967', '1363969', '1363970', '1363971', '1363977', '1363980', '1363981']], 'Nehalot': ['d5', 11, ['1170529', '1170530', '1170531', '1170532', '1170533', '1170534', '1170535', '1170537', '1170538', '1170539', '1170540', '1170541']], 'Berachot': ['25', 11, ['927647', '927667', '927670', '927671', '927672', '927673', '927674', '927675', '927676', '927677', '927678', '927679']], "Metamme'ey Mishkav uMoshav": ['a4', 13, ['1524532', '1524534', '1524535', '1524542', '1524544', '1524545', '1524546', '1524549', '1524578', '1524579', '1524580', '1524585', '1524587', '1524588']], 'Nedarim': ['62', 13, ['973879', '973880', '973881', '973882', '973883', '973884', '973885', '973886', '973887', '973888', '973889', '973890', '973891', '973892']], 'Shevitat Asor': ['33', 3, ['936025', '936026', '936027', '936028']], 'Talmud Torah': ['13', 7, ['910970', '910973', '910974', '910975', '910977', '910979', '910980', '911561']], 'Malveh veLoveh': ['d3', 27, ['1159433', '1159438', '1159439', '1159440', '1159441', '1159442', '1159443', '1159444', '1159445', '1159447', '1159449', '1159450', '1159451', '1159452', '1159453', '1159454', '1159455', '1161173', '1161174', '1161175', '1161176', '1161179', '1161180', '1161181', '1161182', '1161183', '1161184', '1161185']], 'Mikvot': ['a8', 11, ['1526062', '1526065', '1526066', '1526067', '1526068', '1526069', '1526070', '1526071', '1526072', '1526073', '1526074', '1526075']], 'Mamrim': ['e3', 7, ['1181843', '1181852', '1181853', '1181854', '1181855', '1181856', '1181857', '1181858']], 'Shemita': ['77', 13, ['1007157', '1007161', '1007162', '1007164', '1007165', '1007167', '1007168', '1007170', '1007171', '1007173', '1007174', '1007176', '1007177', '1007178']], 'Maaseh HaKorbanot': ['85', 19, ['1017009', '1017013', '1017014', '1017015', '1017016', '1017017', '1017018', '1017019', '1017020', '1017021', '1017022', '1017023', '1017024', '1017025', '1017026', '1017027', '1017028', '1017029', '1017030', '1017048']], "Chometz U'Matzah": ['35', 8, ['937298', '937300', '937301', '937302', '937303', '937304', '937305', '937306', '937307']], 'Kilaayim': ['71', 10, ['986688', '986690', '986691', '986692', '986693', '986694', '986695', '986696', '986697', '986698', '986689']], 'Maaserot': ['74', 14, ['997069', '997072', '997073', '997074', '997075', '997076', '997077', '997078', '997079', '997080', '997081', '997082', '997083', '997084', '997085']], "Ta'aniyot": ['39', 5, ['951993', '951995', '951996', '951997', '951998', '951999']], 'Chovel uMazzik': ['b4', 8, ['1088906', '1088908', '1088909', '1088910', '1088911', '1088912', '1088913', '1088914', '1088915']], 'Yibbum vChalitzah': ['43', 8, ['960618', '960619', '960620', '960621', '960622', '960623', '960624', '960625', '960626']], "Tum'at Tsara`at": ['a3', 16, ['1524492', '1524493', '1524497', '1524500', '1524502', '1524507', '1524510', '1524511', '1524514', '1524516', '1524517', '1524518', '1524521', '1524523', '1524524', '1524527', '1524530']], 'Milah': ['26', 3, ['932220', '932325', '932327', '932330']], 'Ishut': ['41', 25, ['952873', '952874', '952875', '952876', '952878', '952879', '952880', '952881', '952882', '952883', '952884', '952885', '952886', '952887', '952888', '952889', '952890', '952891', '952892', '952893', '952894', '952895', '952896', '952897', '952899', '952900']], 'Kiddush HaChodesh': ['38', 19, ['947915', '947918', '947919', '947920', '947921', '947922', '947923', '947925', '947926', '947927', '947928', '947929', '947930', '947931', '947932', '947933', '947934', '947935', '947942', '947943']], 'Beis Habechirah': ['81', 8, ['1007192', '1007194', '1007195', '1007196', '1007197', '1007198', '1007199', '1007200', '1007193']], "She'ar Avot HaTum'ah": ['a5', 20, ['1525214', '1525216', '1525226', '1525229', '1525230', '1525231', '1525232', '1525234', '1525236', '1525237', '1525239', '1525240', '1525241', '1525243', '1525246', '1525247', '1525248', '1525249', '1525250', '1525253', '1525255']], 'Shvuot': ['61', 12, ['973861', '973863', '973864', '973865', '973866', '973867', '973868', '973869', '973870', '973871', '973872', '973873', '973874']], 'Parah Adummah': ['a2', 15, ['1517250', '1517254', '1517255', '1517256', '1517259', '1517261', '1517264', '1517300', '1517304', '1517305', '1517308', '1517314', '1517319', '1517321', '1517323', '1517327']], 'Sotah': ['45', 4, ['960637', '960638', '960639', '960640', '960641']], 'Genevah': ['b2', 9, ['1088854', '1088866', '1088868', '1088870', '1088872', '1088877', '1088873', '1088874', '1088875', '1088876']], 'Haggadah': ['35', 1, ['944176']]
		};
        var match,
			reg = /(\(|\s|^)\[(?:mt)[;,. :-]([a-zA-Z' ]{2,}?)[.]?([;., :-]\d{1,2})?([;., :-]\d{1,2})?([;., :-][cel]{0,3})?\]($|[\s,.;:\)])/mig;
        while ((match = reg.exec(t.value)) !== null) {
            var topic = match[2],
                chpt = match[3] || 0, //if no chapter specfied, default to 0
                law = match[4] || '',
                flags = match[5] || '',
                pre = match[1] || '',
                suf = match[6] || '',
                found = false;

            if (chpt) chpt = parseInt(chpt.slice(1), 10); //if chpt specified, strip leading chr and convert to int
            if (law) law = parseInt(law.slice(1), 10); //same for law
            topic = topic.toLowerCase().replace(/'/g, '').split(' ');//sanitize input and split it into words.

            function search (redo){
				var last, //most recent topic matched, gets used if counter==1
					counter, //keep track of how many topics the word matches
					topics_found = [], //keep track of which topics.
					word = '';
				redo = typeof(redo) !== 'undefined' ? redo : false; //if redo isn't passed, default to false.
				for (var wordi = 0; wordi < topic.length; wordi++) { //iterate through each word in input
					counter = 0; //reset the counter for each word
					if (!redo) {//first time through
						console.log('redo false');
						word = new RegExp(topic[wordi], 'i'); //turn word into a regex for searching
					}else{//nothing found last time, try again while stripping out prefixes
						word = new RegExp(topic[wordi].replace(/^(v|ve|u|ha|u)/,''), 'i');
						console.log('redo true');
						console.log(word);
					}
					if (topics_found.length === 0) { //if we haven't found any matches yet from previous words
						for (var syni = 0; syni < spellings.length; syni++) { //iterate through different topics
							if (word.test(spellings[syni])) { //check if the word is in the topic's synonyms
								counter++;
								topics_found.push(syni); //add the topic index to the list of topics matched
								last = spellings[syni].slice(0, spellings[syni].indexOf(':')); //assign the topic name to 'last`
							}
						}
					} else { //we've already matched some topics from previous words
						for (var topi = 0; topi < topics_found.length; topi++) { //only iterate through already matched topics
							var syni = topics_found[topi];
							if (word.test(spellings[syni])) {
								counter++;
								last = spellings[syni].slice(0, spellings[syni].indexOf(':'));
							}
						}
					}
					if (counter === 1) { //only one topic matched, so we know we've got the right one
						//found = true;
						return last; //don't even go through the rest of the words
					} else {
						console.log('not cool');
					}
				}
			
				if (!found) { //No match :( (Had to use the found var because JavaScript has no for{}else{} syntax
					if (topics_found.length > 1) {//ambiguous. multiple matches found
						alert("We're sorry; we couldn't figure out which part of Rambam you were trying to link to. The text you entered, (" + '"' + match[2] + '"' + ") seemed ambiguous to our system, and could have referred to multiple topics. Try to refine your entry by making it more specific. \n\nIf you'd like, you can ping @HodofHod in this chat room and he'll look into it: \nhttp://chat.stackexchange.com/rooms/9434");
						return false;
					} else { //no matches found at all.
						if (!redo) { //we haven't retried with out prefixes
							redo = true;
							return search(redo); //then we'll try
							}
						else { //been there, done that
							alert("We're sorry; we couldn't figure out which part of Rambam you were trying to link to. The text you entered, (" + '"' + match[2] + '"'  + ") was not recognized by our system. This might be because you're using a spelling or an abbreviation that isn't in our system yet. \n\nIf you'd like to add this spelling, you can ping @HodofHod in this chat room and he'll look into it: \nhttp://chat.stackexchange.com/rooms/9434");
							return false;
						}
					}
				}
			}
			topic = search();
			console.log('topic '+ topic);
			if (!topic){
				continue;
			}
			if (chpt > mtmap[topic][1]) {
				alert('"' + chpt + '" is not a valid chapter for Hilchot ' + topic + '. \n\nThere are only ' + (mtmap[topic][1]) + ' chapters in Hilchot' + topic + '\n\nPlease try again.');
				continue;
			}
			var res;
			if (flags.indexOf('e') !== -1) {//english flags is set.
				res = chabadMT(topic, chpt, mtmap);
			} else {
				res = mechonMamreMT(topic, chpt, law, mtmap);
			}
			if (flags.indexOf('l') !== -1) { //link flag is set
				if (chpt) { //chpt has been specified
					topic = topic + ' ' + chpt;
				}
				if (law) {
					topic = topic + ':' + law;
				}
				res = '[Rambam, Hilchot ' + topic + '](' + res + ')';
			}
			if (res) t.value = t.value.replace(match[0], pre + res + suf); //the if should be redundant
        }
    }

    function chabadMT(topic, chpt, mtmap) {
        var base = 'http://www.chabad.org/library/article_cdo/aid/',
            cid = mtmap[topic][2][chpt];
        return base + cid;
    }

    function mechonMamreMT(topic, chpt, law, mtmap) {
        var base = 'http://www.mechon-mamre.org/i/',
            cid = mtmap[topic][0],
            res;
        if (chpt < 10) {
            chpt = '0' + chpt;
        }
        res = base + cid + chpt + '.htm';
        if (law){
            res += '#' + law;
        }
        return res;
    }
    $('textarea[name="comment"]:not(.ref-hijacked)').live('focus', function () {
        new refhijack($(this)); //Alright, everybody keep calm! I'm hijackin' this 'ere comment box!
    });
    $('textarea[name="post-text"]:not(.ref-hijacked)').live('focus', function () {
        new refhijack($(this)); //And while I'm at it, I'll them questions and answers too!
    });
	$('#input:not(.ref-hijacked)').live('focus', function () {
        new refhijack($(this)); //Ye didn't think I'd ferget them there chats, didja?
    });
});
