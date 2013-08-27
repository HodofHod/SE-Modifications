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
// @version       0.3.3
// ==/UserScript==


/* 
The MIT License (MIT)

Copyright (c) 2013  HodofHod (https://github.com/HodofHod, http://judaism.stackexchange.com/users/883/hodofhod)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. 
*/

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
	
	var currentTextfield = $('textarea, input[type=text]');
    $(document).ready(function(){
        $(document).on('focus', 'textarea, input[type=text]', function(){
			currentTextfield = $(this);
		});
		
        if (window.location.host == "chat.stackexchange.com" && 
            $('#footer-logo a').attr('href').match(/judaism|hermeneutics|hebrew/)){ //Chat
            var btn = $('<button class="button" id="hbk-toggle" title="Hebrew Keyboard"><span>א</span></button>');
                //kb = createKeyboard(),
            btn.appendTo($("#chat-buttons"));
        } else { //not Chat
            var btn = $('<button id="hbk-toggle" title="Hebrew Keyboard"><span>א</span></button>');
			btn.css({
				position: 'fixed',
				bottom: '10px',
				left: '10px',
				border: 'dotted 1px',
				cursor: 'pointer',
				'font-size': '150%'
			}).appendTo($('body'))
		}
		var wh = $(window).height(),
			ww = $(window).width(),
			kb = createKeyboard().css({
									position:'fixed',
									'z-index':'2'
								}).hide();
		$('#hbk-toggle span').css({
                'padding': '3px',
                'text-align': 'center',
                'background-image': "none",
				'font-weight':'bolder'
            });
		$(window).resize(function(){
			kb.css({
				top: '+=' + ($(window).height() - wh) + 'px',
				left: '+=' + ($(window).width() - ww) + 'px',
			});
			if (kb.css('top') < '0px') kb.css('top','0px');
			wh = $(window).height();
			ww = $(window).width();
		});
		
		btn.on('click', function () {
			kb.toggle();
		})
    });
    
    function createKeyboard() {
        var stand = "קראטוןםפשדגכעיחלךףזסבהנמצתץ",
            alpha = "חזוהדגבאסןנםמלךכיטתשרקץצףפע",
            nek = ["שׁ", "שׂ", "וְ", "וֱ", "וֲ", "וֳ", "וִ", "וֵ", "וֶ", "וַ", "וָ", "וֹ", "וֻ", "וּ"],
			x = 10,
			y = 20,
            kb = $('<div class="hbkeyboard"></div>').appendTo($("body"));

        $.each(alpha.split('').concat(nek), function (i, letter) {
            kb.append('<button type="button" class="hbkey" data-t="' + letter.slice(-1) + '">' + letter + '</button>');
        });

        kb.children('button:lt(8)').wrapAll('<div class="first kbrow">');
        kb.children('button:lt(10)').wrapAll('<div class="second kbrow">');
        kb.children('button:lt(9)').wrapAll('<div class="third kbrow">');
        kb.children('button:lt(14)').wrapAll('<div class="fourth kbrow">');
        kb.children('.first.kbrow').prepend('<button type="button" class="hbkey" data-t="&rlm;">&amp;rlm;</button>');
        kb.prepend('<div style="position:relative; height:20px"><button type="button" id="setbutton" data-t="">Settings</button><button type="button" id="closebutton" data-t="">x</button></div>');
        kb.prepend('<span style="position:absolute; top:0; right:0; color:transparent">בס"ד</span>');
        $('<div class="kbsettings" style="text-align:left;"><div><input type="checkbox" id="keylayout">Use standard layout</div><div><input type="checkbox" id="rlm">Insert &amp;rlm; as text (posts only)</div></div>').appendTo(kb).hide();

        /* CSS For Keyboard and buttons */
	$('.kbsettings input').css('margin-left','5px');
        kb.css({
            position: 'absolute',
            border: 'dotted 1px',
            padding: '4px',
            width: '280px',
            left: x,
            top: y,
            'background-color': 'rgba(241, 241, 241, 1)'
        });
        $('.kbrow').css({
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
        $('.fourth.kbrow .hbkey').css({
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
			t = currentTextfield[0];
            var start = t.selectionStart,
                end = t.selectionEnd,
                text = t.value,
				chr = $(this).data('t');
				
			if (chr === '‏' && $('#rlm').is(':checked') && t.id !== 'input') chr = '&rlm;';//special case for rlm.
            var res = text.slice(0, start) + chr + text.slice(end),
                len = chr.length;
            $(t).val(res).trigger('input').focus();
            t.setSelectionRange(start + len, start + len);
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

        $('#keylayout').change(function(){
            var layout = $(this).prop('checked') ? stand : alpha;
            $('.hbkey').slice(1, 28).each(function (index) {
                $(this).data('t', layout[index]).text(layout[index]);
            });
            docCookies.setItem('layoutSetting', $('#keylayout').prop('checked'));
        });
        
        $('#rlm').change(function(){
            docCookies.setItem('rlmSetting', $('#rlm').prop('checked'));
        });         
        
        $('#rlm').prop('checked', docCookies.getItem('rlmSetting') == "true" ?  true : false).change();
        $('#keylayout').prop('checked', docCookies.getItem('layoutSetting') == "true" ? true : false).change();
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
			if ($(drag.elem).css('top') < '0px') $(drag.elem).css('top','0px');
            drag.x = e.pageX;
            drag.y = e.pageY;
        }
    });
    $(document).mouseup(function () {
        drag.state && (drag.state = false);
    });
});
