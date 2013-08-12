// ==UserScript==
// @name          SE Hebrew Keyboard
// @description   Adds a Hebrew Keyboard to StackExchange's post editor
// @match         http://judaism.stackexchange.com/*
// @match         http://meta.judaism.stackexchange.com/*
// @match         http://hebrew.stackexchange.com/*
// @match         http://meta.hebrew.stackexchange.com/*
// @match         http://hermeneutics.stackexchange.com/*
// @match         http://meta.hermeneutics.stackexchange.com/*
// @match         http://chat.stackexchange.com/rooms/*
// @author        HodofHod
// @namespace     HodofHod
// @version       0.2.2
// ==/UserScript==

//Thanks: @Manishearth for the inject() function, and James Montagne for the draggability.
//Thanks to all who've helped debug and discuss, especially the Mac users, nebech.

function inject(f) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = '(' + f.toString() + ')()';
    document.body.appendChild(script);
}

inject(function HBKeyboard() {
    var docCookies = { //from developer.mozilla.org/en-US/docs/Web/API/document.cookie
        getItem: function (sKey) {
            return unescape(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
        },
        setItem: function (sKey, sValue) {
            if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
                return false;
            }
            document.cookie = escape(sKey) + "=" + escape(sValue) + "; expires=Fri, 31 Dec 9999 23:59:59 GMT; domain=stackexchange.com; path=/";
            return true;
        },
        hasItem: function (sKey) {
            return (new RegExp("(?:^|;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
        },
    };
  $(document).ready(function(){
        $(document).on('focus', '.wmd-input.processed:visible', function(){
            var lastel = $(this).prev().find('.wmd-button').not(".wmd-help-button").filter(":last");
            if (lastel.attr('class').indexOf("hbk-toggle") !== -1) return true;

            var kb = createKeyboard(this).hide(),
                btn = '<li class="wmd-button hbk-toggle" title="Hebrew Keyboard"><span>&#x2328;</span></li>';

            btn = $(btn).css("left", lastel.css("left")).css("left", "+=25").insertAfter(lastel);
            $('.hbk-toggle span').css({
                'font-size': '150%',
                'padding': '3px',
                'text-align': 'center',
                'background-image': "none"
            });
            btn.on('click', function () {
                kb.toggle();
            });
        });
        
        if (window.location.host == "chat.stackexchange.com" && 
            $('#footer-logo a').attr('href').match(/judaism|hermeneutics|hebrew/)){
            var btn = '<button class="button" id="hbk-toggle" title="Hebrew Keyboard">&#x2328;</button>',
                kb = createKeyboard($('#input')[0]),
                wh = $(window).height(),
                ww = $(window).width();
            kb.css({
                position:'fixed',
                'z-index':'2',
                top: '-=' + kb.outerHeight() + 'px'
            }).hide();
            $(btn).appendTo($("#chat-buttons"))
                  .on('click', function(){kb.toggle();});
            
            $(window).resize(function(){
                kb.css({
                    top: '+=' + ($(window).height() - wh) + 'px',
                    left: '+=' + ($(window).width() - ww) + 'px',
                });
                wh = $(window).height();
                ww = $(window).width();
            });
        }
    });
    
    function createKeyboard(wmd) {
        var stand = "קראטוןםפשדגכעיחלךףזסבהנמצתץ",
            alpha = "חזוהדגבאסןנםמלךכיטתשרקץצףפע",
            nek = ["שׁ", "שׂ", "וְ", "וֱ", "וֲ", "וֳ", "וִ", "וֵ", "וֶ", "וַ", "וָ", "וֹ", "וֻ", "וּ"],
            x = $(wmd).offset().left + $(wmd).outerWidth(),
            y = $(wmd).offset().top,
            kb = $('<div class="hbkeyboard"></div>').appendTo($("body"));

        $.each(alpha.split('').concat(nek), function (i, letter) {
            kb.append('<button type="button" class="hbkey" data-t="' + letter.slice(-1) + '">' + letter + '</button>');
        });

        kb.children('button:lt(8)').wrapAll('<div class="first row">');
        kb.children('button:lt(10)').wrapAll('<div class="second row">');
        kb.children('button:lt(9)').wrapAll('<div class="third row">');
        kb.children('button:lt(14)').wrapAll('<div class="fourth row">');
        kb.children('.first.row').prepend('<button type="button" class="hbkey" data-t="&rlm;">&amp;rlm;</button>');
        kb.prepend('<div style="position:relative; height:20px"><button type="button" id="setbutton" data-t="">Settings</button><button type="button" id="closebutton" data-t="">x</button></div>');
        kb.prepend('<span style="position:absolute; top:0; right:0; color:transparent">בס"ד</span>');
        $('<div class="kbsettings"><div><input type="checkbox" id="layout">Use standard layout</div><div><input type="checkbox" id="rlm">Insert &amp;rlm; as text (posts only)</div></div>').appendTo(kb).hide();

        /* CSS For Keyboard and buttons */
        kb.css({
            position: 'absolute',
            border: 'dotted 1px',
            padding: '4px',
            width: '280px',
            left: x,
            top: y,
            'background-color': 'rgba(241, 241, 241, 1)'
        });
        $('.row').css({
            position: 'relative',
            'white-space': 'nowrap',
            'text-align': 'right'
        });
        $('.first, .third').css({
            right: '15px'
        });
        $('.fourth').css({ //nekudos row
            'text-align': 'center'
        });
        $('.hbkey').css({
            margin: '0px 0px',
            display: 'inline-block',
            width: '26px',
            'min-height': '25px',
            'font-family': 'FrankRuehl, New Peninim MT, Arial, sans-serif',
            'font-size': '20px',
            'vertical-align': 'top'
        });
        $('.fourth.row .hbkey').css({
            direction:'rtl',
            padding: '0',
            width: '20px',
            'font-size': '26px'
        });
        $('.first .hbkey:first').css({//&rlm; button
            width:'54px',
            'font-size':'16px',
            'min-height': '25px',
            'line-height': '21px'
        });
        
        
        /* Event handling for buttons and checkboxes*/
        kb.find('.hbkey').click(function () {
            var start = wmd.selectionStart,
                end = wmd.selectionEnd,
                text = wmd.value,
                res = text.slice(0, start) + $(this).data('t') + text.slice(end),
                len = $(this).data('t').length;
            $(wmd).val(res).trigger('input');
            
            wmd.setSelectionRange(start + len, start + len);
        });

        $('#setbutton, #closebutton')
            .css({
                border: 'none',
                background: 'transparent',
                position: 'absolute',
                top: 0,
                'font-size': '10px',
                'font-family': 'FrankRuehl, New Peninim MT, Arial, sans-serif',
        }).off();

        $('#setbutton') //Settings button
            .css('left',0)
            .click(function () {
                $(this).text($(this).text() == "Settings" ? "Keyboard" : "Settings");
                $('.first, .second, .third, .fourth').slideToggle();
                $('.kbsettings').slideToggle();
            });

        $('#closebutton')//x button
            .css('right',0)
            .click(function () {
                kb.fadeToggle('medium');
            });

        $('#layout').change(function(){
            var layout = $(this).prop('checked') ? stand : alpha;
            $('.hbkey').slice(1, 28).each(function (index) {
                $(this).data('t', layout[index]).text(layout[index]);
            });
            docCookies.setItem('layoutSetting', $('#layout').prop('checked'));
        });
        
        $('#rlm').change(function(){
            if($(wmd).attr('id') !== 'input'){
                var r = $('.first .hbkey:first'),
                    rv = $(this).is(':checked') ? '&rlm;' : '‏';//it's there, trust me
                r.data('t', rv);
            }
            docCookies.setItem('rlmSetting', $('#rlm').prop('checked'));
        });         
        
        $('#rlm').prop('checked', docCookies.getItem('rlmSetting') == "true" ?  true : false).change();
        $('#layout').prop('checked', docCookies.getItem('layoutSetting') == "true" ? true : false).change();
        return kb;
    }
    
    
  
    //Draggability
    var drag = {
        elem: null,
        x: 0,
        y: 0,
        state: false
    };
    var delta = {
        x: 0,
        y: 0
    };
    $(document).on('mousedown', '.hbkeyboard', function (e) {
        if (!drag.state) {
            drag.elem = this;
            drag.x = e.pageX;
            drag.y = e.pageY;
            drag.state = true;
        }
        return false;
    });
    $(document).mousemove(function (e) {
        if (drag.state) {
            delta.x = e.pageX - drag.x;
            delta.y = e.pageY - drag.y;
            var cur_offset = $(drag.elem).offset();

            $(drag.elem).offset({
                left: (cur_offset.left + delta.x),
                top: (cur_offset.top + delta.y)
            });
            drag.x = e.pageX;
            drag.y = e.pageY;
        }
    });
    $(document).mouseup(function () {
        drag.state && (drag.state = false);
    });
});
