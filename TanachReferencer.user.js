// ==UserScript==
// @name          SE Tanach Referencer
// @description   Links Biblical references to Chabad.org's online Tanach.
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
// @version       1.0.1
// ==/UserScript==


/* 
Credits:        
@TimStone for the inject() function and some stray bits
@Menachem for the Chabad.org and Mechon Mamre links, and for all the debugging help
Joel Nothman and bibref.hebtools.com's spellings, which I pruned and modded.
*/


function inject() {
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
        var textarea = t.addClass('ref-hijacked')[0],
            form = t.closest('form');

        form.focusout(function () {
            console.log('stopped');
            link(textarea);
            StackExchange.MarkdownEditor.refreshAllPreviews();
        });
    }

    function link(t) {
        console.log("links!");
        var spellings = [
            ['Divrei Hayamim I', 'div1', '1chronicles', '1ch', '1chr', '1chron', '1ch', '1chr', '1chron', '1chronicles', '1stchronicles', 'ch1', 'chr1', 'chr1', 'chronicles1', 'chroniclesi', 'cr1', 'cr1', 'div1', 'divreihayamim1', 'firstchronicles', 'ich', 'ichr', 'ichron', 'ichronicles', 'divreihayamimi'],
            ['Melachim I', 'mel1', '1kings', '1kgs', '1ki', '1k', '1kg', '1kgs', '1ki', '1kin', '1kings', '1stkgs', '1stkings', 'firstkgs', 'firstkings', 'ikgs', 'iki', 'ikings', 'ki1', 'kings1', 'kingsi', 'kings1', 'melachim1', 'mlachim1', 'mlachima', 'melachimi'],
            ['Divrei Hayamim II', 'div2', '2chronicles', '2ch', '2chr', '2chron', '2ch', '2chr', '2chron', '2chronicles', '2ndchronicles', 'ch2', 'chr2', 'chr2', 'chronicles2', 'chroniclesii', 'cr2', 'cr2', 'div2', 'divreihayamim2', 'iich', 'iichr', 'iichron', 'iichronicles', 'secondchronicles', 'divreihayamimii'],
            ['Melachim II', 'mel2', '2kings', '2kgs', '2ki', '2k', '2kg', '2kgs', '2ki', '2kin', '2kings', '2ndkgs', '2ndkings', 'iikgs', 'iiki', 'iikings', 'ki2', 'kings2', 'kingsii', 'kings2', 'melachim2', 'mlachim2', 'mlachimb', 'secondkgs', 'secondkings', 'melachimii'],
            ['Bereshit', 'genesis', 'ber', 'beraishis', 'beraishit', 'berayshis', 'bereishis', 'bereishit', 'braishis', 'braishit', 'brayshis', 'brayshit', 'breishis', 'breishit', 'ge', 'gen', 'geneza', 'gn', 'bre', 'bereshit'],
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

        var reg = /(\(|\s|^)\[(?:ref|t)[;,. :-]([\w ]{2,}?)[;., :-](\d{1,2})([;., :-]\d{1,3})?([;., :-][trm]{0,3})?\](\)|\s|$)/mig,
            match;

        while ((match = reg.exec(t.value)) !== null) {
            var book = match[2].toLowerCase(),
                chpt = match[3],
                vrs = match[4] || '',
                flags = match[5] || '',
                pre = match[1] || '',
                suf = match[6] || '',
                replacement = false;
            found = null;

            book = book.replace(/ /g, '');
            vrs = vrs.replace(/[;., :-]/g, '');
            flags = flags.toLowerCase();

            for (var i = 0; i < spellings.length; i++) {
                if ($.inArray(book, spellings[i]) > -1) {
                    book = spellings[i][0];
                    found = true;
                    break;
                }
            }
            if (!found) {
                continue;
            }

            if (flags.indexOf('m') !== -1) {
                console.log('mechon');
                replacement = mechonMamre(book, chpt, vrs, flags);
            } else {
                console.log('chabad');
                replacement = chabad(book, chpt, vrs, flags);
            }
            if (replacement) {
                t.value = t.value.replace(match[0], match[1] + replacement + match[6]);
            }
        }
        return;
    }

    function mechonMamre(book, chpt, vrs, flags) {
        var mmap = {
            'Nachum': ['19', 3],
            'Shoftim': ['07', 21],
            'Melachim II': ['09b', 25],
            'Nechemiah': ['35b', 13],
            'Divrei Hayamim II': ['25b', 36],
            'Kohelet': ['31', 12],
            'Iyov': ['27', 42],
            'Yirmiyahu': ['11', 52],
            'Daniel': ['34', 12],
            'Malachi': ['24', 3],
            'Yeshayahu': ['10', 66],
            'Shmuel II': ['08b', 24],
            'Yonah': ['17', 4],
            'Esther': ['33', 10],
            'Yehoshua': ['06', 24],
            'Devarim': ['05', 34],
            'Yoel': ['14', 4],
            'Chavakuk': ['20', 3],
            'Rus': ['29', 4],
            'Tzefaniah': ['21', 3],
            'Bamidbar': ['04', 36],
            'Michah': ['18', 7],
            'Vayikra': ['03', 27],
            'Zechariah': ['23', 14],
            'Melachim I': ['09a', 22],
            'Shemot': ['02', 40],
            'Shmuel I': ['08a', 31],
            'Amos': ['15', 9],
            'Shir HaShirim': ['30', 8],
            'Mishlei': ['28', 31],
            'Ezra': ['35a', 10],
            'Chaggai': ['22', 2],
            'Bereshit': ['01', 50],
            'Eichah': ['32', 5],
            'Hoshea': ['13', 14],
            'Yechezkel': ['12', 48],
            'Divrei Hayamim I': ['25a', 29],
            'Tehillim': ['26', 150],
            'Ovadiah': ['16', 1]
        };
        var url = null,
            cid = null;

        chpt = parseInt(chpt, 10);
        if (chpt > mmap[book][1]) {
            return false;
        }
        if (chpt < 10) {
            cid = '0' + chpt;
        } else if (chpt > 99) {
            cid = String.fromCharCode(97 + parseInt(chpt.toString().charAt(1))) + chpt.toString().charAt(2);
        } else {
            cid = chpt;
        }
        url = 'http://www.mechon-mamre.org/p/pt/pt' + mmap[book][0] + cid + '.htm';
        if (vrs) {
            url += '#' + vrs;
        }
        if (flags.indexOf('t') !== -1) {
            if (vrs) {
                vrs = ':' + vrs;
            }
            var title = '[' + book + ' ' + chpt + vrs + ']';
            return title + '(' + url + ')';
        } else {
            return url;
        }
    }

    function chabad(book, chpt, vrs, flags) {
        var cmap = {
            'Tzefaniah': [16200, 3],
            'Chaggai': [16203, 2],
            'Tehillim': [16222, 150],
            'Michah': [16187, 7],
            'Shoftim': [15809, 21],
            'Melachim II': [15907, 25],
            'Nechemiah': [16508, 13],
            'Kohelet': [16462, 12],
            'Malachi': [16219, 3],
            'Yirmiyahu': [15998, 52],
            'Yonah': [16183, 4],
            'Zechariah': [16205, 14],
            'Melachim I': [15885, 22],
            'Divrei Hayamim II': [16550, 36],
            'Shmuel I': [15830, 31],
            'Yeshayahu': [15932, 66],
            'Shmuel II': [15861, 24],
            'Amos': [16173, 9],
            'Shir HaShirim': [16445, 8],
            'Vayikra': [9902, 27],
            'Ezra': [16498, 10],
            'Esther': [16474, 10],
            'Bamidbar': [9929, 36],
            'Yoel': [16169, 4],
            'Yehoshua': [15785, 24],
            'Iyov': [16403, 42],
            'Divrei Hayamim I': [16521, 29],
            'Mishlei': [16372, 31],
            'Bereshit': [8165, 8166, 8167, 8168, 8169, 8171, 8170, 8172, 8173, 8174, 8175, 8176, 8208, 8209, 8210, 8211, 8212, 8213, 8214, 8215, 8216, 8217, 8218, 8219, 8220, 8221, 8222, 8223, 8224, 8225, 8226, 8227, 8228, 8229, 8230, 8231, 8232, 8233, 8234, 8235, 8236, 8237, 8238, 8239, 8240, 8241, 8242, 8243, 8244, 8245],
            'Devarim': [9965, 34],
            'Daniel': [16484, 12],
            'Chavakuk': [16197, 3],
            'Eichah': [16457, 5],
            'Hoshea': [16155, 14],
            'Yechezkel': [16099, 48],
            'Shemot': [9862, 40],
            'Rus': [16453, 4],
            'Nachum': [16194, 3],
            'Ovadiah': [16182, 1]
        };
        var cid = null,
            url = null;

        if (book == "Bereshit") {
            if (chpt > cmap[book].length) {
                return false;
            }
            cid = cmap[book][chpt - 1];
        } else {
            chpt = parseInt(chpt, 10);
            if (chpt > cmap[book][1]) {
                return false;
            }
            cid = cmap[book][0] + chpt - 1;
        }
        url = 'http://www.chabad.org/library/bible_cdo/aid/' + cid;
        if (flags.indexOf('r') !== -1) {
                        url += "/showrashi/true";
                    }
        if (vrs) {
            url += '#v' + vrs;
        }
        if (flags.indexOf('t') !== -1) {
            if (vrs) {
                vrs = ':' + vrs;
            }
            var title = '[' + book + ' ' + chpt + vrs + ']';
            return title + '(' + url + ')';
        } else {
            return url;
        }
    }
    $('textarea[name="comment"]:not(.ref-hijacked)').live('focus', function () {
        new refhijack($(this));
    });
    $('textarea[name="post-text"]:not(.ref-hijacked)').live('focus', function () {
        new refhijack($(this));
    });
});
