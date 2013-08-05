// ==UserScript==
// @name          SE Hebrew Keyboard
// @description   Adds a Hebrew Keyboard to StackExchange's post editor
// @match         http://judaism.stackexchange.com/*
// @match         http://meta.judaism.stackexchange.com/*
// @match         http://chat.stackexchange.com/rooms/*
// @author        HodofHod
// @namespace     HodofHod
// @version       0.1
// ==/UserScript==

//Thanks: @Manishearth for the inject() function, and James Montagne for the draggability.

function inject(f) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = '(' + f.toString() + ')()';
    document.body.appendChild(script);
}

inject(function HBKeyboard() {
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
			$('#footer-logo a').attr('href') == "http://judaism.stackexchange.com"){
			var btn = '<button class="button" id="hbk-toggle" title="Hebrew Keyboard">&#x2328;</button>',
				kb = createKeyboard($('#input')[0]);
			kb.css({
				position:'fixed',
				'z-index':'2',
				top: $('#input-area').offset().top - kb.height() + 'px'
			}).hide();
			$(btn).appendTo($("#chat-buttons"))
			      .on('click', function(){kb.toggle();});
		}
	});

    function createKeyboard(wmd) {
        var stand = "קראטוןםפשדגכעיחלךףזסבהנמצתץ".split(''),
			alpha = "חזוהדגבאסןנםמלךכיטתשרקץצףפע".split(''),
			nek = ["שׁ", "שׂ", "וְ", "וֱ", "וֲ", "וֳ", "וִ", "וֵ", "וֶ", "וַ", "וָ", "וֹ", "וֻ", "וּ"],
			x = $(wmd).offset().left + $(wmd).outerWidth(),
			y = $(wmd).offset().top,
			kb = $('<div class="keyboard"></div>').appendTo($("body"));
			
        $.each(alpha.concat(nek), function (i, letter) {
            kb.append('<button type="button" class="key">' + letter + '</button>');
        });
        kb.children('button:lt(8)').wrapAll('<div class="first row">');
        kb.children('button:lt(10)').wrapAll('<div class="second row">');
        kb.children('button:lt(9)').wrapAll('<div class="third row">');
        kb.children('button:lt(14)').wrapAll('<div class="fourth row">');
        kb.children('.first.row').prepend('<button type="button" class="key">&amp;rlm;&rlm;</button>');
        kb.find('.key').wrap('<li class="keyli"></li>');


        kb.css({
            position: 'absolute',
            border: 'dotted 1px',
            padding: '4px',
            resize: 'both',
            overflow: 'hidden',
            width: 'auto',
            left: x,
            top: y,
			'background-color': 'rgba(241, 241, 241, 0.5)',
        });
        $('.fill').css({
            visibility: 'hidden',
            padding: '0'
        });
        $('.row').css({
            'white-space': 'nowrap',
            position: 'relative',
            display: 'table',
            width: '100%',
            height: '22%'
        });
        $('.first').css({
            left: 0,
            right: '4%',
            width: '96%'
        });
        $('.second').css({
            left: '4%',
            right: 0,
            width: '96%'
        });
        $('.third').css({
            left: '8%',
            right: '4%',
            width: '88%'
        });
        $('.fourth').css({
            height: '34%'
        });
        $('.key').css({
            margin: '0px 0px',
            width: '100%',
            height: '100%',
            'font-family': 'FrankRuehl',
            'font-size': '130%',
            'padding': '3px',
            'min-width': '26px',
            'min-height': '25px'
        });
        $('.keyli').css({
            width: 'auto',
            display: 'table-cell',
            float: 'none',
            height: 'auto',
        });
        $('.fourth.row .key').css({
            'font-size': '150%',
            padding: '2px',
            'min-height': '30px',
            'min-width': '20px'
        });

        kb.find('.key').click(function () {
            var start = wmd.selectionStart,
                end = wmd.selectionEnd,
                text = wmd.value,
                res = text.slice(0, start) + $(this).text().slice(-1) + text.slice(end);
            $(wmd).val(res).trigger('input');
            wmd.setSelectionRange(start + 1, start + 1);
        });
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
    $(document).on('mousedown', '.keyboard', function (e) {
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
