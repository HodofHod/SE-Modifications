// ==UserScript==
// @name         Chat Mods
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
// ==/UserScript==

function inject(f) {
  var script = document.createElement('script');
    script.type = 'text/javascript';
		script.textContent = '(' + f.toString() + ')()';
	document.body.appendChild(script);
};

function sidebar(){
    var sidebar = document.querySelector('#sidebar');
    sidebar.style.height = "auto";
    sidebar.style.bottom = "88px";
    sidebar.style.overflowY = "scroll";
};

inject(sidebar);
