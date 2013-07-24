// ==UserScript==
// @name         Sidebar Scrollbar
// @description  Makes the lower starred messages in SE chat rooms accessible.
// @include      http://chat.meta.stackoverflow.com/rooms/*
// @include      http://chat.stackexchange.com/rooms/*
// @include      http://chat.stackoverflow.com/rooms/*
// @include      http://chat.askubuntu.com/rooms/*
// @match        http://chat.meta.stackoverflow.com/rooms/*
// @match        http://chat.stackexchange.com/rooms/*
// @match        http://chat.stackoverflow.com/rooms/*
// @match        http://chat.askubuntu.com/rooms/*
// @author       @HodofHod
// @namespace    HodofHod
// @version      1.1
// ==/UserScript==

function inject(f) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = '(' + f.toString() + ')()';
    document.body.appendChild(script);
}

function addScroll() {
    $('#sidebar').css({
                        height:'auto',
                        bottom:'88px',
                        'overflow-y':'auto',
                    });
    $('#my-rooms').css("margin-left", "18px")
}

inject(addScroll);
