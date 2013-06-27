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
// @version       0.7
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
            ['divrei hayamim i', 'div1', '1 chronicles', '1 ch', '1 chr', '1 chron', '1ch', '1chr', '1chron', '1chronicles', '1st chronicles', 'ch1', 'chr 1', 'chr1', 'chronicles 1', 'chronicles i', 'cr 1', 'cr1', 'div 1', 'divrei hayamim 1', 'first chronicles', 'i ch', 'i chr', 'i chron', 'i chronicles'],
            ['melachim i', 'mel1', '1 kings', '1 kgs', '1 ki', '1k', '1kg', '1kgs', '1ki', '1kin', '1kings', '1st kgs', '1st kings', '3 regn', '3 rg', 'first kgs', 'first kings', 'i kgs', 'i ki', 'i kings', 'ki1', 'kings 1', 'kings i', 'kings1', 'melachim 1', 'mlachim 1', 'mlachim a'],
            ['divrei hayamim ii', 'div2', '2 chronicles', '2 ch', '2 chr', '2 chron', '2ch', '2chr', '2chron', '2chronicles', '2nd chronicles', 'ch2', 'chr 2', 'chr2', 'chronicles 2', 'chronicles ii', 'cr 2', 'cr2', 'div 2', 'divrei hayamim 2', 'ii ch', 'ii chr', 'ii chron', 'ii chronicles', 'second chronicles'],
            ['melachim ii', 'mel2', '2 kings', '2 erg', '2 kgs', '2 ki', '2k', '2kg', '2kgs', '2ki', '2kin', '2kings', '2nd kgs', '2nd kings', '4 regn', '4 rg', 'ii kgs', 'ii ki', 'ii kings', 'ki2', 'kings 2', 'kings ii', 'kings2', 'melachim 2', 'mlachim 2', 'mlachim b', 'second kgs', 'second kings'],
            ['bereshit', 'genesis', 'ber', 'beraishis', 'beraishit', 'berayshis', 'bereishis', 'bereishit', 'braishis', 'braishit', 'brayshis', 'brayshit', 'breishis', 'breishit', 'ge', 'gen', 'geneza', 'gn', 'bre'],
            ['yirmiyahu', 'jeremiah', 'je', 'jer', 'jeremia', 'jeremija', 'jr', 'yeremiya', 'yeremiyah', 'yeremiyahu'],
            ['michah', 'micah', 'mch', 'mi', 'mic', 'mich', 'micha', 'mih', 'miha', 'miq'],
            ['rus', 'ruth', 'rt', 'rth', 'ru', 'rut', 'ruta'],
            ['shemot', 'exodus', 'ex', 'exd', 'exo', 'exod', 'sh', 'shemot', 'shm', 'shmot', 'shemos', 'shmos', 'she'],
            ['vayikra', 'leviticus', 'lb', 'le', 'leu', 'lev', 'lv', 'vay', 'vayikra', 'vayiqra', 'vayyikra', 'vayyiqra'],
            ['bamidbar', 'numbers', 'bamidbar', 'bmidbar', 'br', 'nb', 'nm', 'nomb', 'nu', 'num'],
            ['devarim', 'deuteronomy', 'de', 'deu', 'deut', 'deuteronomio', 'deuteronomium', 'dev', 'devarim', 'dt'],
            ['yehoshua', 'joshua', 'ios', 'jos', 'josh', 'josua', 'joz', 'jozua', 'jozue', 'jsh', 'yehoshua', 'yoshua'],
            ['shoftim', 'judges', 'jud', 'jdg', 'jdgs', 'jg', 'jt', 'judg', 'jue', 'jug', 'juges', 'shofetim', 'shoftim'],
            ['shmuel i', 'shm1', '1 samuel', '1 s', '1 sa', '1 sam', '1 shmuel', '1 sm', '1s', '1sa', '1sam', '1samuel', '1sm', '1st samuel', 'first samuel', 'i sa', 'i sam', 'i samuel', 'sa 1', 'sa1', 'sam 1', 'sam1', 'samuel 1', 'samuel i', 'samuel1', 'shmuel 1', 'shmuel a', 'shmuel i', 'shmuel1'],
            ['shmuel ii', 'shm2', '2 samuel', '2 s', '2 sa', '2 sam', '2 shmuel', '2 sm', '2nd samuel', '2s', '2sa', '2sam', '2samuel', '2sm', 'ii sa', 'ii sam', 'ii samuel', 'sa 2', 'sa2', 'sam 2', 'sam2', 'samuel 2', 'samuel ii', 'samuel2', 'second samuel', 'shmuel 2', 'shmuel b', 'shmuel ii', 'shmuel2'],
            ['yeshayahu', 'isaiah', 'isiah', 'is', 'isa', 'yeshaya', 'yeshayah', 'yeshayahu'],
            ['yechezkel', 'ezekiel', 'ez', 'eze', 'ezec', 'ezek', 'ezekial', 'ezk', 'hes', 'yechezkel', 'yecheskel', ''],
            ['hoshea', 'hosea', 'ho', 'hos', 'hoshea', 'hosea'],
            ['yoel', 'joel', 'ioel', 'jl', 'joe', 'jol', 'yoel'],
            ['amos', 'amos', 'am', 'amo', 'ams'],
            ['ovadiah', 'obadiah', 'ab', 'abd', 'abdija', 'ob', 'oba', 'obad', 'obadija', 'obadja', 'obd', 'ovadia', 'ovadiah', 'ovadya', 'ovadyah'],
            ['yonah', 'jonah', 'ion', 'jna', 'jnh', 'jon', 'jona', 'yona', 'yonah'],
            ['nachum', 'nahum', 'na', 'nachum', 'nah', 'naham', 'nam'],
            ['chavakuk', 'habakkuk', 'ha', 'hab', 'habacuc', 'habakuk', 'habaqquq', 'habaquq', 'chavakuk'],
            ['tzefaniah', 'zephaniah', 'sef', 'sefanja', 'sof', 'sofonija', 'soph', 'tsefania', 'tsephania', 'tzefaniah', 'tzephaniah', 'zef', 'zefanija', 'zefanja', 'zep', 'zeph', 'zephanja', 'zp', 'zp'],
            ['chaggai', 'haggai', 'hag', 'hagai', 'hagg', 'haggay', 'hg', 'hgg', 'chagai', 'chaggai'],
            ['zechariah', 'zechariah', 'sach', 'sacharja', 'za', 'zac', 'zach', 'zacharia', 'zah', 'zaharija', 'zc', 'zch', 'zec', 'zech', 'zecharia', 'zecharya', 'zekhariah'],
            ['malachi', 'malachi', 'mal', 'malahija', 'malakhi', 'maleachi', 'ml'],
            ['tehillim', 'psalms', 'ps', 'psa', 'psalm', 'psalmen', 'psalmi', 'psg', 'pslm', 'psm', 'pss', 'sal', 'salmos', 'sl', 'tehilim', 'tehillim', 'thilim', 'thillim'],
            ['mishlei', 'proverbs', 'mishlei', 'mishley', 'pr', 'pro', 'prou', 'prov', 'prv'],
            ['iyov', 'job', 'hi', 'hiob', 'ijob', 'iob', 'iyov', 'iyyov', 'jb'],
            ['shir hashirim', 'songs', 'song of solomon', 'sgs', 'sng', 'sol', 'song', 'song of songs', 'songofsolomon', 'sos', 'ss', 'so', 'songofsongs', 'shir', 'shir hashirim'],
            ['eichah', 'lamentations', 'aicha', 'aichah', 'eicha', 'eichah', 'eikha', 'eikhah', 'la', 'lam', 'lamentaciones', 'lm'],
            ['kohelet', 'ecclesiastes', 'ec', 'ecc', 'eccl', 'eccles', 'ecl', 'koh', 'koheles', 'kohelet', 'qo', 'qoh', 'qohelet', 'qoheleth', 'qohleth'],
            ['esther', 'esther', 'est', 'ester', 'estera', 'esth'],
            ['daniel', 'daniel', 'da', 'dan', 'dn'],
            ['ezra', 'ezra', '1 esr', '1 ezr', 'esr', 'esra', 'ezr'],
            ['nechemiah', 'nehemiah', '2 esr', '2 ezr', 'ne', 'nechemiah', 'neh', 'nehemia', 'nehemija', 'nehemyah']
        ];
        var map = {
            'nachum': ['16194', '16195', '16196'],
            'shoftim': ['15809', '15810', '15811', '15812', '15813', '15814', '15815', '15816', '15817', '15818', '15819', '15820', '15821', '15822', '15823', '15824', '15825', '15826', '15827', '15828', '15829'],
            'nechemiah': ['16508', '16509', '16510', '16511', '16512', '16513', '16514', '16515', '16516', '16517', '16518', '16519', '16520'],
            'divrei hayamim ii': ['16550', '16551', '16552', '16553', '16554', '16555', '16556', '16557', '16558', '16559', '16560', '16561', '16562', '16563', '16564', '16565', '16566', '16567', '16568', '16569', '16570', '16571', '16572', '16573', '16574', '16575', '16576', '16577', '16578', '16579', '16580', '16581', '16582', '16583', '16584', '16585'],
            'kohelet': ['16462', '16463', '16464', '16465', '16466', '16467', '16468', '16469', '16470', '16471', '16472', '16473'],
            'iyov': ['16403', '16404', '16405', '16406', '16407', '16408', '16409', '16410', '16411', '16412', '16413', '16414', '16415', '16416', '16417', '16418', '16419', '16420', '16421', '16422', '16423', '16424', '16425', '16426', '16427', '16428', '16429', '16430', '16431', '16432', '16433', '16434', '16435', '16436', '16437', '16438', '16439', '16440', '16441', '16442', '16443', '16444'],
            'yirmiyahu': ['15998', '15999', '16000', '16001', '16002', '16003', '16004', '16005', '16006', '16007', '16008', '16009', '16010', '16011', '16012', '16013', '16014', '16015', '16016', '16017', '16018', '16019', '16020', '16021', '16022', '16023', '16024', '16025', '16026', '16027', '16028', '16029', '16030', '16031', '16032', '16033', '16034', '16035', '16036', '16037', '16038', '16039', '16040', '16041', '16042', '16043', '16044', '16045', '16046', '16047', '16048', '16049'],
            'daniel': ['16484', '16485', '16486', '16487', '16488', '16489', '16490', '16491', '16492', '16493', '16494', '16495'],
            'malachi': ['16219', '16220', '16221'],
            'yeshayahu': ['15932', '15933', '15934', '15935', '15936', '15937', '15938', '15939', '15940', '15941', '15942', '15943', '15944', '15945', '15946', '15947', '15948', '15949', '15950', '15951', '15952', '15953', '15954', '15955', '15956', '15957', '15958', '15959', '15960', '15961', '15962', '15963', '15964', '15965', '15966', '15967', '15968', '15969', '15970', '15971', '15972', '15973', '15974', '15975', '15976', '15977', '15978', '15979', '15980', '15981', '15982', '15983', '15984', '15985', '15986', '15987', '15988', '15989', '15990', '15991', '15992', '15993', '15994', '15995', '15996', '15997'],
            'shmuel ii': ['15861', '15862', '15863', '15864', '15865', '15866', '15867', '15868', '15869', '15870', '15871', '15872', '15873', '15874', '15875', '15876', '15877', '15878', '15879', '15880', '15881', '15882', '15883', '15884'],
            'yonah': ['16183', '16184', '16185', '16186'],
            'melachim ii': ['15907', '15908', '15909', '15910', '15911', '15912', '15913', '15914', '15915', '15916', '15917', '15918', '15919', '15920', '15921', '15922', '15923', '15924', '15925', '15926', '15927', '15928', '15929', '15930', '15931'],
            'yehoshua': ['15785', '15786', '15787', '15788', '15789', '15790', '15791', '15792', '15793', '15794', '15795', '15796', '15797', '15798', '15799', '15800', '15801', '15802', '15803', '15804', '15805', '15806', '15807', '15808'],
            'devarim': ['9965', '9966', '9967', '9968', '9969', '9970', '9971', '9972', '9973', '9974', '9975', '9976', '9977', '9978', '9979', '9980', '9981', '9982', '9983', '9984', '9985', '9986', '9987', '9988', '9989', '9990', '9991', '9992', '9993', '9994', '9995', '9996', '9997', '9998'],
            'yoel': ['16169', '16170', '16171', '16172'],
            'chavakuk': ['16197', '16198', '16199'],
            'rus': ['16453', '16454', '16455', '16456'],
            'tzefaniah': ['16200', '16201', '16202'],
            'bamidbar': ['9929', '9930', '9931', '9932', '9933', '9934', '9935', '9936', '9937', '9938', '9939', '9940', '9941', '9942', '9943', '9944', '9945', '9946', '9947', '9948', '9949', '9950', '9951', '9952', '9953', '9954', '9955', '9956', '9957', '9958', '9959', '9960', '9961', '9962', '9963', '9964'],
            'michah': ['16187', '16188', '16189', '16190', '16191', '16192', '16193'],
            'esther': ['16474', '16475', '16476', '16477', '16478', '16479', '16480', '16481', '16482', '16483'],
            'vayikra': ['9902', '9903', '9904', '9905', '9906', '9907', '9908', '9909', '9910', '9911', '9912', '9913', '9914', '9915', '9916', '9917', '9918', '9919', '9920', '9921', '9922', '9923', '9924', '9925', '9926', '9927', '9928'],
            'zechariah': ['16205', '16206', '16207', '16208', '16209', '16210', '16211', '16212', '16213', '16214', '16215', '16216', '16217', '16218'],
            'melachim i': ['15885', '15886', '15887', '15888', '15889', '15890', '15891', '15892', '15893', '15894', '15895', '15896', '15897', '15898', '15899', '15900', '15901', '15902', '15903', '15904', '15905', '15906'],
            'shemot': ['9862', '9863', '9864', '9865', '9866', '9867', '9868', '9869', '9870', '9871', '9872', '9873', '9874', '9875', '9876', '9877', '9878', '9879', '9880', '9881', '9882', '9883', '9884', '9885', '9886', '9887', '9888', '9889', '9890', '9891', '9892', '9893', '9894', '9895', '9896', '9897', '9898', '9899', '9900', '9901'],
            'shmuel i': ['15830', '15831', '15832', '15833', '15834', '15835', '15836', '15837', '15838', '15839', '15840', '15841', '15842', '15843', '15844', '15845', '15846', '15847', '15848', '15849', '15850', '15851', '15852', '15853', '15854', '15855', '15856', '15857', '15858', '15859', '15860'],
            'amos': ['16173', '16174', '16175', '16176', '16177', '16178', '16179', '16180', '16181'],
            'shir hashirim': ['16445', '16446', '16447', '16448', '16449', '16450', '16451', '16452'],
            'mishlei': ['16372', '16373', '16374', '16375', '16376', '16377', '16378', '16379', '16380', '16381', '16382', '16383', '16384', '16385', '16386', '16387', '16388', '16389', '16390', '16391', '16392', '16393', '16394', '16395', '16396', '16397', '16398', '16399', '16400', '16401', '16402'],
            'ezra': ['16498', '16499', '16500', '16501', '16502', '16503', '16504', '16505', '16506', '16507'],
            'chaggai': ['16203', '16204'],
            'bereshit': ['8165', '8166', '8167', '8168', '8169', '8171', '8170', '8172', '8173', '8174', '8175', '8176', '8208', '8209', '8210', '8211', '8212', '8213', '8214', '8215', '8216', '8217', '8218', '8219', '8220', '8221', '8222', '8223', '8224', '8225', '8226', '8227', '8228', '8229', '8230', '8231', '8232', '8233', '8234', '8235', '8236', '8237', '8238', '8239', '8240', '8241', '8242', '8243', '8244', '8245'],
            'eichah': ['16457', '16458', '16459', '16460', '16461'],
            'hoshea': ['16155', '16156', '16157', '16158', '16159', '16160', '16161', '16162', '16163', '16164', '16165', '16166', '16167', '16168'],
            'yechezkel': ['16099', '16100', '16101', '16102', '16103', '16104', '16105', '16106', '16107', '16108', '16109', '16110', '16111', '16112', '16113', '16114', '16115', '16116', '16117', '16118', '16119', '16120', '16121', '16122', '16123', '16124', '16125', '16126', '16127', '16128', '16129', '16130', '16131', '16132', '16133', '16134', '16135', '16136', '16137', '16138', '16139', '16140', '16141', '16142', '16143', '16144', '16145', '16146'],
            'divrei hayamim i': ['16521', '16522', '16523', '16524', '16525', '16526', '16527', '16528', '16529', '16530', '16531', '16532', '16533', '16534', '16535', '16536', '16537', '16538', '16539', '16540', '16541', '16542', '16543', '16544', '16545', '16546', '16547', '16548', '16549'],
            'tehillim': ['16222', '16223', '16224', '16225', '16226', '16227', '16228', '16229', '16230', '16231', '16232', '16233', '16234', '16235', '16236', '16237', '16238', '16239', '16240', '16241', '16242', '16243', '16244', '16245', '16246', '16247', '16248', '16249', '16250', '16251', '16252', '16253', '16254', '16255', '16256', '16257', '16258', '16259', '16260', '16261', '16262', '16263', '16264', '16265', '16266', '16267', '16268', '16269', '16270', '16271', '16272', '16273', '16274', '16275', '16276', '16277', '16278', '16279', '16280', '16281', '16282', '16283', '16284', '16285', '16286', '16287', '16288', '16289', '16290', '16291', '16292', '16293', '16294', '16295', '16296', '16297', '16298', '16299', '16300', '16301', '16302', '16303', '16304', '16305', '16306', '16307', '16308', '16309', '16310', '16311', '16312', '16313', '16314', '16315', '16316', '16317', '16318', '16319', '16320', '16321', '16322', '16323', '16324', '16325', '16326', '16327', '16328', '16329', '16330', '16331', '16332', '16333', '16334', '16335', '16336', '16337', '16338', '16339', '16340', '16341', '16342', '16343', '16344', '16345', '16346', '16347', '16348', '16349', '16350', '16351', '16352', '16353', '16354', '16355', '16356', '16357', '16358', '16359', '16360', '16361', '16362', '16363', '16364', '16365', '16366', '16367', '16368', '16369', '16370', '16371'],
            'ovadiah': ['16182']
        };

        var reg = /(\(|\s|^)\[ref:(\w{2,}[1-2]?)-(\d{1,2})-(\d{1,3})-?([tr]{0,2}?\])(\)|\s|$)/ig,
            url, match;
			
        while ((match = reg.exec(t.value)) !== null) {
            console.log(match);
            var book = match[2],
                chpt = match[3],
                vrs = match[4],
                flags = match[5],
                pre = '' || match[1],
                suf = '' || match[6];

            for (var i = 0; i < spellings.length; i++) {
                if ($.inArray(book, spellings[i]) > -1) {
                    book = spellings[i][0];
                    url = 'http://www.chabad.org/library/bible_cdo/aid/' + map[book][chpt - 1];
                    if (flags.indexOf('r') !== -1) {
                        url += "/showrashi/true";
                    }
                    url += '#v' + vrs;
                    break;
                }
            }
            console.log(flags);
            if (url) {
                if (flags.indexOf('t') !== -1) {
                    var title = '[' + toTitleCase(book) + ' ' + chpt + ':' + vrs + ']';
                    t.value = t.value.replace(match[0], match[1] + title + '(' + url + ')' + match[6]);
                } else {
                    t.value = t.value.replace(match[0], match[1] + url + match[6]);
                }
            }
        }
        return;
    }

    function toTitleCase(str) {
        return str.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }
    $('textarea[name="comment"]:not(.ref-hijacked)').live('focus', function () {
        new refhijack($(this));
    });
    $('textarea[id="wmd-input"]:not(.ref-hijacked)').live('focus', function () {
        new refhijack($(this));
    });
});
