// ==UserScript==
// @name         Chat Mods
// @description  Modifications and bug fixes for StackExchange's chat rooms
// @include      http://chat.meta.stackoverflow.com/rooms/*
// @include      http://chat.stackexchange.com/rooms/*
// @include      http://chat.stackoverflow.com/rooms/*
// @include      http://chat.askubuntu.com/rooms/*
// @match        http://chat.meta.stackoverflow.com/rooms/*
// @match        http://chat.stackexchange.com/rooms/*
// @match        http://chat.stackoverflow.com/rooms/*
// @match        http://chat.askubuntu.com/rooms/*
// @author       @HodofHod
// @version      1.2
// ==/UserScript==

function inject(f) {
  var script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = '(' + f.toString() + ')()';
  document.body.appendChild(script);
};

//Makes the lower starred messages in SE chat rooms accessible.
function addScroll() {
    $('#sidebar').css({
                        height:'auto',
                        bottom:$('#input-area').outerHeight(),
                        'overflow-y':'auto',
                    });
    $('#my-rooms').css("margin-left", "18px")
}

//Fixes bidirectional bug in starred chat messages.
function bidi(){
    reg = /[\p{InHebrew}\p{InArabic}]/;
	$.each($('[id^=summary_]'), function(i, star){
		reg.test($(star).html()) && $(star).html($(star).html().replace(/ - <a/, ' &lrm;- <a'));
	});
}

inject(addScroll);
inject(bidi);
