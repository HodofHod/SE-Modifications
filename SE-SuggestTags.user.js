// ==UserScript==
// @name          SE Tag Suggestions
// @description   Suggest related tags when asking or editing questions.
// @match         http://*.stackexchange.com/questions/*
// @match         http://stackoverflow.com/questions/*
// @match         http://meta.stackoverflow.com/questions/*
// @match         http://superuser.com/questions/*
// @match         http://meta.superuser.com/questions/*
// @match         http://serverfault.com/questions/*
// @match         http://meta.serverfault.com/questions/*
// @match         http://askubuntu.com/questions/*
// @match         http://meta.askubuntu.com/questions/*
// @match         http://answers.onstartups.com/questions/*
// @match         http://meta.answers.onstartups.com/questions/*
// @match         http://stackapps.com/questions/*
// @author        HodofHod
// @namespace     HodofHod
// @version       0.2
// ==/UserScript==

//TODO Expand to inlcude other sites, including css sizes and colors
//TODO Expand to include retagging for 10kers. //Done
//TODO Better suggestions based on current tags. Maybe make separate API requests for each tags, and then rank like the similarqs.
//TODO Prevent suggestion box from sliding up when deleting a tag. //Done
//Thanks: @Manishhearth for the inject() function
//        @Anurag for the sortByFrequency() function (http://stackoverflow.com/a/3579651)

function inject(f) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = '(' + f.toString() + ')()';
    document.body.appendChild(script);
}

inject(function (){
	function create(){
		if ($('#suggest-div').length) {console.log('twice'); return;} //edge case where create() could be called twice. Obsolete now, I think
		$('.tag-editor input').addClass('sug-hijacked'); 
		var	suggestLink = $('<div id="suggest-div" style="float:right;"><a id="suggest-toggle" style="cursor:default;">Suggest Tags</a></div>').insertBefore('label:contains("Tags")'),
			slider = $('<div id="suggest-links" style="position:absolute;z-index:301;border:solid 1px;white-space:nowrap; background-color:white;padding:4px;line-height:18px;list-style-type:none;display:none;"><li><a id="sugBTags">- Based on Your Tags</a></li><li><a id="sugBQs">- Based on Similar Questions\' Tags</a></li></div>').appendTo(suggestLink);
		slider.find('li').css({'list-style-type': 'none'});
		
		suggestLink.hover(
			function(){slider.stop(true,true).slideDown();},
			function(){slider.slideUp();}
		);
		
		$('#sugBTags').on('click', function(){
			createSuggestionArea('tags');
			$('.suggestion .item-multiplier').attr("title", "Number of questions that share this tag with your tags");
		});
		$('#sugBQs').on('click', function(){
			createSuggestionArea('qs');
			$('.suggestion .item-multiplier').attr("title", "Number of similar questions with this tag");
		});
	}
	var d = [];
	function createSuggestionArea(method){
		if ($('.other').length && d[0] == method && $('.tag-editor .post-tag').text() === d[1]){
			console.log('cached');
			$('.other').slideDown();
		}else{
			console.log('uncached');
			$('.tag-suggestions.other').slideUp(function(){$(this).remove()});
			$('<div class="tag-suggestions other" style="position: absolute; left: 0px; top: 61px; width: 656px;"><p class="sug-status" style="text-align:center;">Loading...</p></div>').insertAfter('.tag-editor');
			if ( $('.tag-editor .post-tag').length >= 5) {
				failed('You already have the maximum number of tags.');
			}else{
				d = [method, $('.tag-editor .post-tag').text()]; //cache it
				method === 'tags' ? similarTags() : similarQs(); //fill suggestion area based on method
			}
		}
		$(document).click(function bl(e){
			if (!$('#suggest-div').parent().has(e.target).length && e.target.className !== "delete-tag"){
				console.log($('#suggest-div').parent());
				console.log(e.target.className);
				console.log($(e.target));
				$('.other').slideUp();
				$(document).off('click', bl);
			}
		});
	}
	function failed(msg){
		console.log('f:'+msg);
		return $('.other .sug-status').fadeOut(function(){$(this).text(msg).fadeIn()});
	}
	function succeeded(){
		console.log('s');
		return $('.other .sug-status').remove() && $('.other .suggestion').slideDown('slow');
	}
	function similarQs(){
		var qs = (document.location.pathname.match('^/questions/ask')
			? $('.answer-summary a:even')
			: $('.sidebar-related .spacer a:odd')).map(function(){return this.href.match(/\/(\d+)\//)[1];}).get(),
			site = document.location.host.replace(/\.stackexchange|\.com/g,''),
			url = 'https://api.stackexchange.com/2.1/questions/' + qs.join('%3B') + '?order=desc&sort=activity&site='+site+'&filter=!LSzbU-PGQA0-8ToXqAh)2k';
		
		if (!qs.length){
			return failed('No similar questions found') && false;
		}
		$.getJSON(url, function(data){
			var tags = [],
				curTags = $('.tag-editor .post-tag').map(function(){return $(this).text();}).get();
			$.each(data.items, function(i, item){
				tags = tags.concat(item.tags);
			});
			tags = tags.filter(function(tag){return curTags.indexOf(tag) === -1;});//filter out already used tags.
			return fillSuggestionArea(sortByFrequency(tags));
		});
	}
	function similarTags(){
		var curTags = $('.tag-editor .post-tag').map(function(){return $(this).text();}).get();
		if (!curTags.length) {return failed('You haven\'t entered any tags yet') && false;}
		
		var site = document.location.host.replace(/\.stackexchange|\.com/g, ''),
			url = 'https://api.stackexchange.com/2.1/tags/' + curTags.join(';') + '/related?site=' + site,
			newTags;
		$.getJSON(url, function(data){
			newTags = data.items.filter(function(tag){return !tag.is_required && !tag.is_moderator_only;});
			if (!newTags.length) {return failed('No related tags found') && false;}
			return fillSuggestionArea(newTags) ;
		});
	}
	function fillSuggestionArea(tags){
      	var sug;
		$.each(tags, function(i, tag){
			sug = $('<div class="suggestion" tabindex="103" style="width: 208px;"><span class="post-tag">'+tag.name+'</span><span class="item-multiplier">×&nbsp;'+tag.count+'</span><p class="more-info"><a href="/tags/'+tag.name+'/info" target="_blank">learn more</a></p></div>').appendTo('.tag-suggestions.other').hide();
			sug.click(function(){
				var t = this;
				$('.tag-editor input').val($(this).children('.post-tag').text() + ' ').trigger('keydown');
				$(t).hide();
				$('.tag-editor .post-tag:last .delete-tag').click(function(){$(t).show();});
			});
		});
		succeeded();
		return true;
	}
	function sortByFrequency(array) {
		var frequency = {};

		array.forEach(function(value) { frequency[value] = 0; });

		var uniques = array.filter(function(value) {
			return ++frequency[value] == 1;
		});

		var sorted = uniques.sort(function(a, b) {
			return frequency[b] - frequency[a];
		});
		var res = [];
		sorted.forEach(function(value) { res.push({name:value, count:frequency[value]}); });
		return res;
	}
	
	if (document.location.pathname.match('^/questions/ask')){
		create();
	}else{
		$(document).on('focus', '.tag-editor input:not(.sug-hijacked)', function(){
			create();
		});
	}
	
});

