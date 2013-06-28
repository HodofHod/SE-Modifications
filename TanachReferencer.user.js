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
// @version       0.8.2
// ==/UserScript==


/* 
Credits:        
@TimStone for the inject() function and some stray bits
@Menachem for the Chabad.org links
bibref.hebtools.com's spellings, which I pruned and modded.
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

        form.focusout(function (e) {
            console.log('stopped');
            link(textarea);
            StackExchange.MarkdownEditor.refreshAllPreviews();
        });
    }

    function link(t) {
        console.log("links!");
        var spellings = [
            ['Divrei Hayamim I', 'div1', '1 chronicles', '1 ch', '1 chr', '1 chron', '1ch', '1chr', '1chron', '1chronicles', '1st chronicles', 'ch1', 'chr 1', 'chr1', 'chronicles 1', 'chronicles i', 'cr 1', 'cr1', 'div 1', 'divrei hayamim 1', 'first chronicles', 'i ch', 'i chr', 'i chron', 'i chronicles', 'divrei hayamim i'],
            ['Melachim I', 'mel1', '1 kings', '1 kgs', '1 ki', '1k', '1kg', '1kgs', '1ki', '1kin', '1kings', '1st kgs', '1st kings', '3 regn', '3 rg', 'first kgs', 'first kings', 'i kgs', 'i ki', 'i kings', 'ki1', 'kings 1', 'kings i', 'kings1', 'melachim 1', 'mlachim 1', 'mlachim a', 'melachim i'],
            ['Divrei Hayamim II', 'div2', '2 chronicles', '2 ch', '2 chr', '2 chron', '2ch', '2chr', '2chron', '2chronicles', '2nd chronicles', 'ch2', 'chr 2', 'chr2', 'chronicles 2', 'chronicles ii', 'cr 2', 'cr2', 'div 2', 'divrei hayamim 2', 'ii ch', 'ii chr', 'ii chron', 'ii chronicles', 'second chronicles', 'divrei hayamim ii'],
            ['Melachim II', 'mel2', '2 kings', '2 erg', '2 kgs', '2 ki', '2k', '2kg', '2kgs', '2ki', '2kin', '2kings', '2nd kgs', '2nd kings', '4 regn', '4 rg', 'ii kgs', 'ii ki', 'ii kings', 'ki2', 'kings 2', 'kings ii', 'kings2', 'melachim 2', 'mlachim 2', 'mlachim b', 'second kgs', 'second kings', 'melachim ii'],
            ['Bereshit', 'genesis', 'ber', 'beraishis', 'beraishit', 'berayshis', 'bereishis', 'bereishit', 'braishis', 'braishit', 'brayshis', 'brayshit', 'breishis', 'breishit', 'ge', 'gen', 'geneza', 'gn', 'bre', 'bereshit'],
            ['Yirmiyahu', 'jeremiah', 'je', 'jer', 'jeremia', 'jeremija', 'jr', 'yeremiya', 'yeremiyah', 'yeremiyahu', 'yirmiyahu'],
            ['Michah', 'micah', 'mch', 'mi', 'mic', 'mich', 'micha', 'mih', 'miha', 'miq', 'michah'],
            ['Rus', 'ruth', 'rt', 'rth', 'ru', 'rut', 'ruta', 'rus'],
            ['Shemot', 'exodus', 'ex', 'exd', 'exo', 'exod', 'sh', 'shemot', 'shm', 'shmot', 'shemos', 'shmos'],
            ['Vayikra', 'leviticus', 'lb', 'le', 'leu', 'lev', 'lv', 'vay', 'vayikra', 'vayiqra', 'vayyikra', 'vayyiqra'],
            ['Bamidbar', 'numbers', 'bamidbar', 'bmidbar', 'br', 'nb', 'nm', 'nomb', 'nu', 'num'],
            ['Devarim', 'deuteronomy', 'de', 'deu', 'deut', 'deuteronomio', 'deuteronomium', 'dev', 'devarim', 'dt'],
            ['Yehoshua', 'joshua', 'ios', 'jos', 'josh', 'josua', 'joz', 'jozua', 'jozue', 'jsh', 'yehoshua', 'yoshua'],
            ['Shoftim', 'judges', 'jud', 'jdg', 'jdgs', 'jg', 'jt', 'judg', 'jue', 'jug', 'juges', 'shofetim', 'shoftim'],
            ['Shmuel I', 'shm1', '1 samuel', '1 s', '1 sa', '1 sam', '1 shmuel', '1 sm', '1s', '1sa', '1sam', '1samuel', '1sm', '1st samuel', 'first samuel', 'i sa', 'i sam', 'i samuel', 'sa 1', 'sa1', 'sam 1', 'sam1', 'samuel 1', 'samuel i', 'samuel1', 'shmuel 1', 'shmuel a', 'shmuel i'],
            ['Shmuel II', 'shm2', '2 samuel', '2 s', '2 sa', '2 sam', '2 shmuel', '2 sm', '2nd samuel', '2s', '2sa', '2sam', '2samuel', '2sm', 'ii sa', 'ii sam', 'ii samuel', 'sa 2', 'sa2', 'sam 2', 'sam2', 'samuel 2', 'samuel ii', 'samuel2', 'second samuel', 'shmuel 2', 'shmuel b', 'shmuel ii'],
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
            ['Shir HaShirim', 'songs', 'song of solomon', 'sgs', 'sng', 'sol', 'song', 'song of songs', 'songofsolomon', 'sos', 'ss', 'so', 'songofsongs', 'shir', 'shir hashirim'],
            ['Eichah', 'lamentations', 'aicha', 'aichah', 'eicha', 'eichah', 'eikha', 'eikhah', 'la', 'lam', 'lamentaciones', 'lm'],
            ['Kohelet', 'ecclesiastes', 'ec', 'ecc', 'eccl', 'eccles', 'ecl', 'koh', 'koheles', 'kohelet', 'qo', 'qoh', 'qohelet', 'qoheleth', 'qohleth'],
            ['Esther', 'esther', 'est', 'ester', 'estera', 'esth'],
            ['Daniel', 'daniel', 'da', 'dan', 'dn'],
            ['Ezra', 'ezra', '1 esr', '1 ezr', 'esr', 'esra', 'ezr'],
            ['Nechemiah', 'nehemiah', '2 esr', '2 ezr', 'ne', 'nechemiah', 'neh', 'nehemia', 'nehemija', 'nehemyah']
        ];
        var map = {
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

        var reg = /(\(|\s|^)\[ref:([\w ]{2,})-(\d{1,2})-?(\d{1,3})?(-[tr]{0,2})?\](\)|\s|$)/mig,
            match;

        while ((match = reg.exec(t.value)) !== null) {
            var book = match[2].toLowerCase(),
                chpt = match[3],
                vrs = match[4] || '',
                flags = match[5] || '',
                pre = match[1] || '',
                suf = match[6] || '',
                cid = null,
                url = null;

            flags = flags.toLowerCase();
            for (var i = 0; i < spellings.length; i++) {
                if ($.inArray(book, spellings[i]) > -1) {
                    book = spellings[i][0];
                    if (book == "Bereshit") {
                        cid = map[book][chpt - 1];
                    } else {
                        chpt = parseInt(chpt, 10);
                        cid = map[book][0] + chpt - 1;
                        if (chpt > map[book][1]) {
                            break;
                        }
                    }
                    url = 'http://www.chabad.org/library/bible_cdo/aid/' + cid;
                    if (flags.indexOf('r') !== -1) {
                        url += "/showrashi/true";
                    }
                    if (vrs) {
                        url += '#v' + vrs;
                    }
                    break;
                }
            }
            if (url) {
                if (flags.indexOf('t') !== -1) {
                    if (vrs) {
                        vrs = ':' + vrs;
                    }
                    var title = '[' + book + ' ' + chpt + vrs + ']';
                    t.value = t.value.replace(match[0], match[1] + title + '(' + url + ')' + match[6]);
                } else {
                    t.value = t.value.replace(match[0], match[1] + url + match[6]);
                }
            }
        }
        return;
    }
    $('textarea[name="comment"]:not(.ref-hijacked)').live('focus', function () {
        new refhijack($(this));
    });
    $('textarea[name="post-text"]:not(.ref-hijacked)').live('focus', function () {
        new refhijack($(this));
    });
});
