// ==UserScript==
// @name         Chat Mods
// @description  Modifications and bug fixes for StackExchange's chat rooms
// @match        http://chat.meta.stackoverflow.com/*
// @match        http://chat.stackexchange.com/*
// @match        http://chat.stackoverflow.com/*
// @match        http://chat.askubuntu.com/*
// @author       @HodofHod
// @version      1.3
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

function followReply(){
    $('.reply-info').click(function(){
        var anchor = this.href.match(/#\d+$/)[0],
            msg = $('#message-' + anchor.slice(1));
        if (msg.length){
            this.href = anchor;
            $('.highlight').removeClass('highlight');
            msg.addClass('highlight');
            $('html, body').animate({ scrollTop: msg.offset().top }, 'fast')
        }
    });
}

if (/^\/rooms\//.test(window.location.pathname)){
    inject(addScroll);
    inject(bidi);
}else if (/^\/transcript\//.test(window.location.pathname)){
    inject(followReply);
}
