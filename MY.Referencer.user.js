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
// @exclude       http://chat.stackexchange.com/*
// @exclude       http://chat.*.stackexchange.com/*
// @exclude       http://api.*.stackexchange.com/*
// @exclude       http://data.stackexchange.com/*
// @exclude       http://*/reputation
// @author        @HodofHod   
// @version       1.9
// ==/UserScript==


/* 
Credits:        
@TimStone for the inject() function and some stray bits
@Menachem for the Chabad.org and Mechon Mamre links, and for all the debugging help
Joel Nothman and bibref.hebtools.com's spellings, which I pruned and modded.

ABANDON ALL HOPE, YE WHO LIKE WELL-WRITTEN CODE. y'know. with standards 'n stuff. (
Are there even standards for JavaScript? Oh well.)
*/

var hodReferencer = hodReferencer || {};

hodReferencer.inject = function() {//Inject the script into the document
    for (var i = 0; i < arguments.length; ++i) {
        if (typeof (arguments[i]) == 'function') {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.textContent = '(' + arguments[i].toString() + ')(jQuery)';
            document.body.appendChild(script);
        }
    }
};

hodReferencer.inject(function ($) {
    function refhijack(t) {
        var textarea = t.addClass('ref-hijacked')[0],//add an extra class. Why? No idea. 
            form = t.closest('form');                //Ask @TimStone, it's his fault

        form.focusout(function () {//when you click away, I pounce!
            tlink(textarea);//check for Tanach links
            glink(textarea);//check for Gemara Links
            StackExchange.MarkdownEditor.refreshAllPreviews();//refresh the Q's & A's preview panes
        });
    }

    function glink(t) {
        var spellings = [
            ['Brachos', 'berachos', 'berachot', 'brachos', 'brachot', 'ber', 'bra', 'brcht', 'brchs', 'br'],
            ['Shabbos', 'shabbos', 'shabbat', 'shabbas', 'shabos', 'shabat', 'shbt', 'shbs', 'shab', 'sha'],
            ['Eruvin', 'eruvin', 'eiruvin', 'eru', 'eir', 'ervn', 'er'],
            ['Pesachim', 'pesachim', 'psachim', 'pesakhim', 'psakhim', 'pes', 'psa', 'pschm', 'ps'],
            ['Shekalim', 'shekalim', 'shekolim', 'shkalim', 'shkolim', 'shk', 'shek'],
            ['Yoma', 'yoma', 'yuma', 'yum', 'yom', 'ym'],
            ['Succah', 'succah', 'succa', 'sukkah', 'sukka', 'suka', 'sukah', 'sk', 'suk', 'suc', 'sc'],
            ['Beitzah', 'beitzah', 'beitza', 'betzah', 'betza', 'bei', 'bet', 'btz', 'be','btz'],
            ['Rosh Hashanah', 'rosh', 'hashana', 'ros', 'rsh', 'rh', 'ro', 'rsh'],
            ['Taanis', 'taanis', 'taanit', 'taanith', 'tanit', 'tanith', 'tanis', 'tan', 'tns','tn','taa','ta'],
            ['Megilah', 'megilah', 'megila', 'meg', 'mgl','mg'],
            ['Moed Katan', 'moedkatan', 'moe', 'md', 'mk'],
            ['Chagigah', 'chagigah', 'chagiga', 'cha', 'chag', 'chg'],
            ['Yevamos', 'yevamos', 'yevamot', 'yevamoth', 'yev', 'yvm', 'yvms', 'yvmt','yv'],
            ['Kesuvos', 'kesuvos', 'kesubos', 'kesubot', 'ketubot', 'ketuvot', 'ksuvos', 'ksubos', 'ket', 'kes', 'ksvs', 'ksvt', 'ktbt','ks','kt'],
            ['Nedarim', 'nedarim', 'ned', 'ndrm', 'ndr', 'ne'],
            ['Nazir', 'nazir', 'nozir', 'naz', 'noz', 'nzr', 'nz'],
            ['Sotah', 'sotah', 'sota', 'sot', 'so','st'],
            ['Gitin', 'gitin', 'gittin', 'git', 'gtn','gt'],
            ['Kiddushin', 'kiddushin', 'kidushin', 'kid', 'ki', 'kds', 'kdshn', 'kdsh','kd'],
            ['Bava Kama', 'bavakama', 'babakama', 'bavakamma', 'bk', 'bkama'],
            ['Bava Metzia', 'bavametzia', 'bavametziah', 'babametziah', 'babametzia', 'bm', 'bmetzia', 'bmetziah'],
            ['Bava Basra', 'bavabasra', 'bavabatra', 'bababatra', 'bavabatrah', 'bb', 'bbatra', 'bbasra', 'bbatrah', 'bbasrah'],
            ['Sanhedrin', 'sanhedrin', 'san', 'sa', 'sn', 'snh', 'snhd', 'snhdrn'],
            ['Makkos', 'makkos', 'makos', 'makkot', 'makot', 'ma', 'mak', 'mkt'],
            ['Shevuos', 'shevuos', 'shevuot', 'shavuot', 'shavuos', 'shv', 'shvt', 'shvs','shvuot','shvuos'],
            ['Avoda Zarah', 'avodazarah', 'avodazara', 'avodahzara', 'avodahzarah', 'avoda', 'avodah', 'az', 'avd', 'avo', 'avod','av'],
            ['Horayos', 'horayos', 'horaiot', 'horaios', 'horayot', 'horaot', 'ho', 'hor', 'hrs', 'hrt','hr'],
            ['Zevachim', 'zevachim', 'zevakhim', 'zev', 'zv', 'zvchm', 'zvkhm'],
            ['Menachos', 'menachos', 'menachot', 'menakhos', 'menakhot', 'men', 'mn', 'mncht', 'mnkht'],
            ['Chulin', 'chulin', 'chullin', 'khulin', 'khullin', 'chu', 'khu', 'chl', 'khl', 'chln', 'khln'],
            ['Bechoros', 'bechoros', 'bchoros', 'bechorot', 'bchorot', 'bec', 'bech', 'bek', 'bekh', 'bcrt', 'bchrt', 'bkhrt', 'bc', 'bch', 'bkh'],
            ['Erchin', 'erchin', 'erkhin', 'arachin', 'arakhin', 'ara', 'erc', 'erk'],
            ['Temurah', 'temurah', 'temura', 'tmurah', 'tmura', 'tem', 'tm', 'tmr'],
            ['Kerisus', 'kerisus', 'krisus', 'keritut', 'kritut', 'kerisos', 'krisos', 'keritot', 'kritot', 'kerithoth', 'krithoth', 'kr', 'ker', 'krt', 'krs'],
            ['Meilah', 'meilah', 'meila', 'mei', 'ml'],
            ['Nidah', 'nidah', 'nida', 'niddah', 'nidda', 'ni', 'nid']
        ],
            mesechtos = {
                'Chulin': [31, 141],
                'Horayos': [28, 13],
                'Shekalim': [5, 22],
                'Bechoros': [32, 60],
                'Gitin': [19, 89],
                'Bava Kama': [21, 118],
                'Sanhedrin': [24, 112],
                'Nazir': [17, 65],
                'Bava Basra': [23, 175],
                'Sotah': [18, 48],
                'Yoma': [6, 87],
                'Meilah': [36, 21],
                'Shevuos': [26, 48],
                'Kerisus': [35, 27],
                'Zevachim': [29, 119],
                'Avoda Zarah': [27, 75],
                'Nidah': [37, 72],
                'Chagigah': [13, 26],
                'Yevamos': [14, 121],
                'Eruvin': [3, 104],
                'Moed Katan': [12],
                'Megilah': [11, 31],
                'Brachos': [1, 63],
                'Kiddushin': [20, 81],
                'Taanis': [10, 30],
                'Temurah': [34, 33],
                'Beitzah': [8, 39],
                'Erchin': [33, 33],
                'Kesuvos': [15, 111],
                'Nedarim': [16, 90],
                'Pesachim': [4, 120],
                'Bava Metzia': [22, 118],
                'Menachos': [30, 109],
                'Succah': [7, 55],
                'Shabbos': [2, 156],
                'Rosh Hashanah': [9, 34],
                'Makkos': [25, 23]
            };

        var reg = /(\(|\s|^)\[(?:ref|g)[;,. :-]([\w ]{2,}?)[;., :-](\d{1,3})([ab])([;., :-][lte]{0,3})?\]($|[\s,.;:\)])/mig,
            match;
        while ((match = reg.exec(t.value)) !== null) {
            var mes = match[2].toLowerCase(),
                page = match[3],
                side = match[4],
                flags = match[5] || '',
                pre = match[1] || '',
                suf = match[6] || '',
                replacement = false,
                found = false,
                res = null;

            mes = mes.replace(/ /g, '');
            flags = flags.toLowerCase();
            for (var i = 0; i < spellings.length; i++) {
                if ($.inArray(mes, spellings[i]) > -1) {
                    mes = spellings[i][0];
                    found = true;
                    break;
                }
            }
            if (!found) { //mesechta name not recognized
                continue; //skip to the next gemara match
            }
            if (parseInt(page, 10) > mesechtos[mes][1] || page == '1' || page == '0'){ //if mesechta doesn't have that page
                continue; //skip to the next gemara match
            }
            if (side == 'a'){//hebrewbooks is weird.
                res = 'http://hebrewbooks.org/shas.aspx?mesechta=' + mesechtos[mes][0] + '&daf=' + page;
            }
            else{
                res = 'http://hebrewbooks.org/shas.aspx?mesechta=' + mesechtos[mes][0] + '&daf=' + page + side;
            }
            if (flags.indexOf('t') !== -1){//text version flag is set
                res = res + '&format=text';
            } else {
                res = res + '&format=pdf';
            }
            if (flags.indexOf('l') !== -1) { //link title flag is set
                res = '[' + mes + ' ' + page + side + '](' + res + ')';
            }
            t.value = t.value.replace(match[0], match[1] + res + match[6]);
        
        }
    }

    function tlink(t) {
        var spellings = [
            ['Divrei Hayamim I', 'div1', '1chronicles', '1ch', '1chr', '1chron', '1ch', '1chr', '1chron', '1chronicles', '1stchronicles', 'ch1', 'chr1', 'chr1', 'chronicles1', 'chroniclesi', 'cr1', 'cr1', 'div1', 'divreihayamim1', 'firstchronicles', 'ich', 'ichr', 'ichron', 'ichronicles', 'divreihayamimi'],
            ['Melachim I', 'mel1', '1kings', '1kgs', '1ki', '1k', '1kg', '1kgs', '1ki', '1kin', '1kings', '1stkgs', '1stkings', 'firstkgs', 'firstkings', 'ikgs', 'iki', 'ikings', 'ki1', 'kings1', 'kingsi', 'kings1', 'melachim1', 'mlachim1', 'mlachima', 'melachimi'],
            ['Divrei Hayamim II', 'div2', '2chronicles', '2ch', '2chr', '2chron', '2ch', '2chr', '2chron', '2chronicles', '2ndchronicles', 'ch2', 'chr2', 'chr2', 'chronicles2', 'chroniclesii', 'cr2', 'cr2', 'div2', 'divreihayamim2', 'iich', 'iichr', 'iichron', 'iichronicles', 'secondchronicles', 'divreihayamimii'],
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
        var map = {'Tzefaniah': [16200, 3, '21'], 'Yeshayahu': [15932, 66, '10'], 'Michah': [16187, 7, '18'], 'Shoftim': [15809, 21, '07'], 'Melachim II': [15907, 25, '09b'], 'Nechemiah': [16508, 13, '35b'], 'Divrei Hayamim II': [16550, 36, '25b'], 'Kohelet': [16462, 12, '31'], 'Iyov': [16403, 42, '27'], 'Yirmiyahu': [15998, 52, '11'], 'Yonah': [16183, 4, '17'], 'Zechariah': [16205, 14, '23'], 'Melachim I': [15885, 22, '09a'], 'Malachi': [16219, 3, '24'], 'Shmuel I': [15830, 31, '08a'], 'Nachum': [16194, 3, '19'], 'Shmuel II': [15861, 24, '08b'], 'Amos': [16173, 9, '15'], 'Shir HaShirim': [16445, 8, '30'], 'Vayikra': [9902, 27, '03'], 'Ezra': [16498, 10, '35a'], 'Esther': [16474, 10, '33'], 'Bamidbar': [9929, 36, '04'], 'Yoel': [16169, 4, '14'], 'Yehoshua': [15785, 24, '06'], 'Chaggai': [16203, 2, '22'], 'Divrei Hayamim I': [16521, 29, '25a'], 'Mishlei': [16372, 31, '28'], 'Bereishit': ['', 50, '01'], 'Devarim': [9965, 34, '05'], 'Daniel': [16484, 12, '34'], 'Chavakuk': [16197, 3, '20'], 'Eichah': [16457, 5, '32'], 'Hoshea': [16155, 14, '13'], 'Yechezkel': [16099, 48, '12'], 'Shemot': [9862, 40, '02'], 'Rus': [16453, 4, '29'], 'Tehillim': [16222, 150, '26'], 'Ovadiah': [16182, 1, '16']};
        
        var reg = /(\(|\s|^)\[(?:ref|t)[;,. :-]([\w ]{2,}?)[;., :-](\d{1,2})([;., :-]\d{1,3})?([;., :-][lrm]{0,3})?\]($|[\s,.;:\)])/mig,//abandon all hope, ye who enter here!
            match;

        while ((match = reg.exec(t.value)) !== null) {//as long as there's another regex match to be found
            var book = match[2].toLowerCase(),
                chpt = match[3],
                vrs = match[4] || '',
                flags = match[5] || '',
                pre = match[1] || '',
                suf = match[6] || '',
                res = false,
                found = null;

            book = book.replace(/ /g, '');//strip out spaces for matching purposes
            vrs = vrs.replace(/[;., :-]/g, '');//strip out leading punctuation
            flags = flags.toLowerCase();//more matching purposes
            if (chpt == '0'){//If the chapter number is 0, then someone's trying to cheat me!
                return false;
            }
            for (var i = 0; i < spellings.length; i++) { //iterate through all the spellings
                if ($.inArray(book, spellings[i]) > -1) {//to check if the regexed book name is there
                    book = spellings[i][0]; //changes `book` to the full, capitalized, book title
                    found = true;
                    break;
                }
            }
            if (!found) { //in case the for loop finishes without matching a book. 
                continue; //And because there's no for{}else{} syntax in js.
            }

            if (flags.indexOf('m') !== -1) { //Mechon Mamre flag is set
                res = mechonMamre(book, chpt, vrs, flags, map);
            } else {//Default to Chabad.org
                res = chabad(book, chpt, vrs, flags, map);
            }
            if (res) { //If chabad() or mechonMamre() returned a value, then replace the stuff.
                if (flags.indexOf('l') !== -1){//if link flag is set..
                    if (vrs) {//if verse has been specified
                         vrs = ':' + vrs;//vrs has already been added to the url
                    }                    //so now a : is added so the title looks pretty
                    var title = '[' + book + ' ' + chpt + vrs + ']';
                    res = title + '(' + res + ')';
                }
                t.value = t.value.replace(match[0], match[1] + res + match[6]);
            }
        
        }
        return;
    }

    function mechonMamre(book, chpt, vrs, flags, map) {
        var url = null,
            cid = null;

        if (parseInt(chpt, 10) > map[book][1]) {//Stop trying to sneak fake chapters in, aright?
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
        if (vrs) {//if verse is specified in the reference
            url += '#' + vrs;
        }
        return url;
        
    }

    function chabad(book, chpt, vrs, flags, map) {
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
        
        if (book == "Bereishit") {//Chabad.org's chapter ids are sequential for each book besides Bereishis. So it gets special treatment. As if it was the youngest child or something
            if (chpt > ber.length) { //STOP IT! I'm warning you!
                return false;
            }
            cid = ber[chpt - 1];
        } else {//Everybody else, eat your vegetables!
            chpt = parseInt(chpt, 10);
            if (chpt > map[book][1]) {//Now you've done it!
                blowUp(computer);//because, why not?
                return false;//for good measure.
                
            }
            cid = map[book][0] + chpt - 1;
        }
        url = 'http://www.chabad.org/library/bible_cdo/aid/' + cid;
        if (flags.indexOf('r') !== -1) {//Rashi flag is set?
            url += "/showrashi/true";
        }
        if (vrs) {//Verse is specified?
            url += '#v' + vrs;
        }
        return url;//Then we're ready to rummmmmmbbblleee.....
    }
    $('textarea[name="comment"]:not(.ref-hijacked)').live('focus', function () {
        new refhijack($(this));//Alright, everybody keep calm! I'm hijackin' this 'ere comment box!
    });
    $('textarea[name="post-text"]:not(.ref-hijacked)').live('focus', function () {
        new refhijack($(this));//And while I'm at it, I'll them questions and answers too!
    });
});
