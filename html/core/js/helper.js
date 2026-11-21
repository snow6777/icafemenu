
var _timer = {};
function delay_execute(fn) {
	if (_timer[fn]) {
		return false
	}

	_timer[fn] = window.setTimeout(function () {
		fn();
		window.setTimeout(function () {
			window.clearTimeout(_timer[fn]);
			delete _timer[fn];
		}, 1000);
	}, 300);

	return false;
}
// debounce/throttle 原来定义在 core.js 的 ICAFEMENU_CORE 对象上，但两个都没有任何开机阶段
// （bootstrap.js/apiclient.js）的早绑定要求——所有调用点（main.js/login.js，以及本文件下面的
// notification_shop_closing/alertPcTimeLeft）都是在主题加载完之后才会跑，搬过来更合适
function debounce(fn, wait = 300) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn.apply(this, args), wait);
	};
}

// throttle function: ensures fn is called at most once every wait ms
function throttle(fn, wait = 300) {
	let lastTime = 0;
	return function (...args) {
		const now = Date.now();
		if (now - lastTime >= wait) {
			lastTime = now;
			return fn.apply(this, args);
		}
	};
}

function toFixed2(data) {
	var v = parseFloat(data);
	return v.toFixed(2);
}

// toLowerCase(data) 原来这里也有一份，全局零调用（都是直接用原生 .toLowerCase() 方法），
// 是死代码，删掉。

function format_time(seconds) {
	// zeroPad 原来是挂在 Number.prototype 上的全局扩展方法，但只有这个函数在用——改成局部函数，
	// 不用再纠结"这个原型扩展要不要在应用启动前就生效"，函数声明在自己作用域内会被提升，不需要
	// 一个独立的安装时机。
	function zeroPad(nr, base) {
		var len = (String(base).length - String(nr).length) + 1;
		return len > 0 ? new Array(len).join('0') + nr : nr;
	}

	// 负数一律按 0 显示。zeroPad 不处理负号，负值会被渲染成 0:00:-1 / 0:-5:00 这种倒计时负数：
	// 会话已到期但服务端还没结账时，TIMEDIFF(status_disconnect_time, NOW()) 是负的，
	// listen.js 把任何负值压成 -1 直接送到这里；剩余秒数自减也可能越过 0。
	seconds = Math.max(0, parseInt(seconds, 10) || 0);

	var hours = parseInt(seconds / 3600);
	var mins = parseInt((seconds % 3600) / 60);
	var secs = seconds % 60;
	var days = parseInt(hours / 24);

	var message = hours.toString() + ":" + zeroPad(mins, 10) + ":" + zeroPad(secs, 10);
	if (days > 0) {
		hours = hours % 24;
		message = days.toString() + ":" + zeroPad(hours, 10) + ":" + zeroPad(mins, 10) + ":" + zeroPad(secs, 10);
	}
	return message;
}

function sha256(ascii) {
	function rightRotate(value, amount) {
		return (value >>> amount) | (value << (32 - amount));
	};

	var mathPow = Math.pow;
	var maxWord = mathPow(2, 32);
	var lengthProperty = 'length'
	var i, j;
	var result = ''

	var words = [];
	var asciiBitLength = ascii[lengthProperty] * 8;

	var hash = sha256.h = sha256.h || [];
	var k = sha256.k = sha256.k || [];
	var primeCounter = k[lengthProperty];

	var isComposite = {};
	for (var candidate = 2; primeCounter < 64; candidate++) {
		if (!isComposite[candidate]) {
			for (i = 0; i < 313; i += candidate) {
				isComposite[i] = candidate;
			}
			hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
			k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
		}
	}

	ascii += '\x80'
	while (ascii[lengthProperty] % 64 - 56) ascii += '\x00'
	for (i = 0; i < ascii[lengthProperty]; i++) {
		j = ascii.charCodeAt(i);
		if (j >> 8) return;
		words[i >> 2] |= j << ((3 - i) % 4) * 8;
	}
	words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
	words[words[lengthProperty]] = (asciiBitLength)

	for (j = 0; j < words[lengthProperty];) {
		var w = words.slice(j, j += 16);
		var oldHash = hash;
		hash = hash.slice(0, 8);

		for (i = 0; i < 64; i++) {
			var i2 = i + j;
			var w15 = w[i - 15], w2 = w[i - 2];

			var a = hash[0], e = hash[4];
			var temp1 = hash[7]
				+ (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
				+ ((e & hash[5]) ^ ((~e) & hash[6]))
				+ k[i]
				+ (w[i] = (i < 16) ? w[i] : (
					w[i - 16]
					+ (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
					+ w[i - 7]
					+ (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
				) | 0
				);
			var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
				+ ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

			hash = [(temp1 + temp2) | 0].concat(hash);
			hash[4] = (hash[4] + temp1) | 0;
		}

		for (i = 0; i < 8; i++) {
			hash[i] = (hash[i] + oldHash[i]) | 0;
		}
	}

	for (i = 0; i < 8; i++) {
		for (j = 3; j + 1; j--) {
			var b = (hash[i] >> (j * 8)) & 255;
			result += ((b < 16) ? 0 : '') + b.toString(16);
		}
	}
	return result;
}

/**
 * Vue 响应式 Offers Carousel 切换方法
 * 用于替代 Bootstrap carousel 的 data-slide 控制
 */
function prevOffer() {
	const total = vueAvailableOffers.items.length;
	if (total <= 1) return;
	
	vueAvailableOffers.currentIndex = (vueAvailableOffers.currentIndex - 1 + total) % total;
	syncOfferActiveState();
}

function nextOffer() {
	const total = vueAvailableOffers.items.length;
	if (total <= 1) return;
	
	vueAvailableOffers.currentIndex = (vueAvailableOffers.currentIndex + 1) % total;
	syncOfferActiveState();
}

function syncOfferActiveState() {
	const currentIndex = vueAvailableOffers.currentIndex;
	theAvailableOffers.forEach((item, index) => {
		item.active = index === currentIndex ? 'active' : '';
	});
	vueAvailableOffers.items.forEach((item, index) => {
		item.active = index === currentIndex ? 'active' : '';
	});
}

function is_locked() {
	return vueGlobal.isLocked;
}

// 原来定义在 login.js，但本文件（helper.js）自己也要用（is_member_birthday_today 等）——
// helper.js 是所有页面共用的工具层，不该反过来依赖某个具体页面模块，纯读全局状态的判断谓词
// 挪过来更合适
function is_logined()
{
	return typeof(thePCStatus.member_account) != 'undefined' && thePCStatus.member_account != null && thePCStatus.member_account.length > 0;
}

function is_member_logined()
{
	// start-session 页面尚无正式会话，thePCStatus.member_account 未经 WSS 赋值
	// 用 theStartSession.member_account 判断会员身份，以便走 member 支付路径
	if (vueGlobal.currentView === 'start-session') {
		return theStartSession.member_account.length > 0 && thePCStatus.member_group_id > MEMBER_GROUP_GUEST;
	}
	return is_logined() && thePCStatus.member_group_id > MEMBER_GROUP_GUEST;
}


function toast(message, level) {
	var toast_level = (typeof (level) == 'undefined' ? 'info' : level);
	var timeout = 5000;
	var extendedTimeOut = 1000;

	if (toast_level == 'warning') {
		timeout = 30000;
		extendedTimeOut = 10000;
	}

	toastr.options = {
		"closeButton": true,
		"debug": false,
		"newestOnTop": true,
		"progressBar": false,
		"positionClass": "toast-top-right",
		"preventDuplicates": false,
		"showDuration": "300",
		"hideDuration": "1000",
		"timeOut": timeout,
		"extendedTimeOut": extendedTimeOut,
		"showEasing": "swing",
		"hideEasing": "linear",
		"showMethod": "fadeIn",
		"hideMethod": "fadeOut",
		"tapToDismiss": true
	};
	return toastr[toast_level](message);
}

function htmlToText(html) {
	const div = document.createElement('div');
	div.textContent = html; // 自动转义 HTML 标签
	return div.innerHTML; // 返回转义后的文本
}

function countdown_stop() {
	if (theCountDownIntervalId != null) {
		clearInterval(theCountDownIntervalId);
		theCountDownIntervalId = null;
	}
}


function countdown_start() {
	if (theSettings.license_using_billing == 0)
		return false;

	if (!is_logined())
		return false;

	countdown_stop();
	theCountDownIntervalId = setInterval(countdown, 1000);

	return true;
}

function unlock_all() {
	ICAFEMENU_CORE.sendCommandToExe("UNLOCK 65535");
	ICAFEMENU_CORE.sendCommandToExe("DISABLEBSOD");
}

function checkout_click() {
	if (thePCStatus.member_group_id != MEMBER_GROUP_POSTPAID)
		vueGlobal.modals.confirmCheckout = true;
}

var theLastAssistSent = 0;
function send_assist() {
	let mins = 5 - Math.floor((new Date() - theLastAssistSent )/60_000);
	if (mins <= 0) {
		theLastAssistSent = new Date();
		ICAFEMENU_CORE.wsssend('remind', 'request', 'web', {
			pc: thePCInfo.pc_name,
			level: 'error',
			timeout: 0,
			message: 'assist'
		});
		toast(translate_string("Your assist request has been sent"));
	} else {
		toast(translate_string("Your assist request has been sent"));
	}
}

function open_url(url) {
	ICAFEMENU_CORE.sendCommandToExe('RUN ' + url);
	console.log('open url ' + url);
}

function localTime(fmt, date) {
	var date = new Date();
	var h = date.getHours();
	var m = date.getMinutes();
	var s = date.getSeconds();
	return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
}

function setDropdownMenu() {
	setTimeout(function () {
		$('.dropdown').mouseenter(function () {
			$(this).find('.dropdown-menu').show();
		});

		$('.dropdown').mouseleave(function () {
			$(this).find('.dropdown-menu').hide();
		});
	}, 100);
}

function getGameName(game_stats_type) {
	const gameMapping = {
		'fortnite-match-stats': 'Fortnite',
		'lol-match-stats': 'League of Legends',
		'valorant-match-stats': 'Valorant',
		'dota2-match-stats': 'Dota 2',
		'csgo-match-stats': 'CS:GO',
		'apex-match-stats': 'Apex Legends',
		"pubg-match-stats": "PUBG"
	};

	return gameMapping[game_stats_type] || '';
}

function setBodyStyle() {
}

/**
 * 从 YouTube 链接中取视频 id，不是 YouTube 链接或取不到 id 时返回 ''。
 * 支持 youtube.com/watch?v=<id>、youtu.be/<id>、youtube.com/embed/<id>、youtube.com/shorts/<id>、youtube.com/live/<id>
 */
function youtube_video_id(url) {
	var u;
	try { u = new URL(url); } catch (e) { return ''; }
	var host = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
	var segs = u.pathname.split('/').filter(s => s.length > 0);
	if (host == 'youtu.be')
		return segs[0] ?? '';
	if (host != 'youtube.com' && host != 'youtube-nocookie.com')
		return '';
	if (u.searchParams.get('v'))
		return u.searchParams.get('v');
	if (segs.length >= 2 && ['embed', 'shorts', 'live'].includes(segs[0]))
		return segs[1];
	return '';
}

// YouTube 背景视频的 embed 地址：静音、无控件、自动循环播放
function youtube_embed_url(id) {
	return "https://www.youtube.com/embed/" + id + "?mute=1&modestbranding=1&autohide=1&showinfo=0&controls=0&autoplay=1&loop=1&playlist=" + id + "&version=3";
}

/**
 * 当前 PC 所在分组单独设置的背景（theSettings.pc_group_background，CP 客户端设置里 Default 之外的分组标签页）
 * 格式见 Helper::normalize_pc_group_background：{"v":2,"groups":[{pc_group_id, client_login_format, client_login_picture, ...}]}，
 * format -1 = 跟随 Default（全局设置），0 = 图片，1 = 视频；地址留空 = 跟随 Default。非空时跟 Default 的
 * client_login_video 一样，支持内置素材 / URL / 本机绝对路径 / 网络共享（图片）、外加 YouTube 链接（视频），
 * CP 端直接让管理员填完整地址，不再是"留空走 posters 约定文件"那一套。
 * @param {string} type 'login' 登录页 | 'home' 首页
 * @returns {{url: string, isVideo: boolean}|null} 跟随 Default 或地址为空时返回 null
 */
var theLastPcGroup = null; // 最近一次已知的本机分组 {id, name}
function pc_group_background(type) {
	// thePCStatus 会被登出流程整个重置成 {member_account: ''}，分组字段随之丢失，这里记住最近一次已知的分组；
	// 登录接口只回填 pc_group_id 不带分组名，id 没变时沿用之前的名字。client_status 首次到达前完全不知道分组，返回 null
	if (typeof thePCStatus !== 'undefined' && thePCStatus.pc_group_id !== undefined) {
		var id = parseInt(thePCStatus.pc_group_id ?? 0) || 0;
		var name = thePCStatus.pc_group_name ?? (theLastPcGroup?.id == id ? theLastPcGroup.name : '');
		theLastPcGroup = { id: id, name: name };
	}
	if (!theLastPcGroup?.id)
		return null;

	var groups = [];
	try { groups = JSON.parse(theSettings.pc_group_background ?? '{}')?.groups ?? []; } catch (e) { groups = []; }
	var row = groups.find(r => parseInt(r.pc_group_id) == theLastPcGroup.id);
	var prefix = type == 'login' ? 'client_login' : 'client_bg';
	var format = parseInt(row?.[prefix + '_format'] ?? -1);
	if (format != 0 && format != 1)
		return null;

	var isVideo = format == 1;
	var path = ((isVideo ? row[prefix + '_video'] : row[prefix + '_picture']) ?? '').trim();
	if (!path)
		return null; // 地址留空：跟随 Default

	return { url: resolve_background_address(path, isVideo), isVideo: isVideo };
}

/**
 * 背景地址 -> 可直接使用的地址。PC 分组背景和锁屏背景共用，规则只写一处。
 * @param {string} path 已 trim 的非空地址：内置素材 / URL / 本机绝对路径 / 网络共享 / YouTube 链接
 * @param {boolean} isVideo
 * @returns {string}
 */
function resolve_background_address(path, isVideo) {
	if (path.startsWith('core/videos/')) {
		// 内置视频：跟全局设置同一套解析规则（经典客户端走本机，remote UI 走 CDN），见 ICAFEMENU_CORE.videos_path()
		return ICAFEMENU_CORE.videos_path(path);
	}
	if (path.startsWith('core/images/')) {
		// 内置图片：经典客户端走本机文件；remote UI 下 libcef 无法访问 file://，local_asset_path 返回 null，
		// 兜底 root_path 即服务器自己的 /client/core/images/（服务器上这批文件确实存在）
		return ICAFEMENU_CORE.local_asset_path(path) ?? ICAFEMENU_CORE.root_path(path);
	}
	if (isVideo) {
		// URL / 本机绝对路径 / 网络共享 / YouTube 链接，跟 Default 的 client_login_video 完全一样，
		// 交给下游自己处理（file:// 自动补全、YouTube 识别），这里不做任何校验
		return path;
	}
	// 图片：URL 或本机绝对路径，跟视频共用同一套本地路径识别规则
	return resolve_local_file_url(path);
}

/**
 * 锁屏背景（theSettings.client_lock_*，CP 客户端设置里的 Lock screen）。
 * format -1 = 沿用首页背景（缺省，返回 none，页面自己的背景透出来），0 = 图片，1 = 视频；地址留空同样视为沿用。
 * 景深用 CSS blur：锁屏时没有在玩游戏，软件渲染的开销可以接受（游戏中不会显示这一层）。
 * 模板里 v-if 带 vueGlobal.isLocked 使用，解锁后元素销毁，视频不在后台解码。
 * @returns {{kind: 'none'|'image'|'video'|'youtube', src: string, blur: number}}
 */
function resolve_lock_background() {
	var none = { kind: 'none', src: '', blur: 0 };
	var format = parseInt(theSettings.client_lock_format ?? -1);
	if (format != 0 && format != 1)
		return none;
	var isVideo = format == 1;
	var path = String((isVideo ? theSettings.client_lock_video : theSettings.client_lock_picture) ?? '').trim();
	if (!path)
		return none;

	var blur = Math.max(0, Math.min(20, parseInt(theSettings.client_lock_blur ?? 0) || 0));
	var src = resolve_background_address(path, isVideo);
	if (!isVideo)
		return { kind: 'image', src: src, blur: blur };

	// YouTube 链接用 embed 播放，其余当普通视频地址
	var youtubeId = youtube_video_id(resolve_local_file_url(src));
	if (youtubeId)
		return { kind: 'youtube', src: youtube_embed_url(youtubeId), blur: blur };
	return { kind: 'video', src: resolve_local_file_url(src), blur: blur };
}

/**
 * 计算登录页/首页背景：本机分组单独设置了就用分组的，否则用 Default（全局设置）。
 * 分组图片叠在全局图之上，加载失败时露出全局图。
 * @param {string} type 'login' | 'home'
 * @returns {{image: string, video: string, preload: string[], fallback: object|null}} image 非空时用图片模式，否则播放 video；
 *          fallback 是 Default 的背景，只在 posters 约定视频（可能不存在）时给出
 */
function resolve_client_background(type) {
	var isLogin = type == 'login';
	var format = (isLogin ? theSettings.client_login_format : theSettings.client_bg_format) ?? 0;
	var globalImage = ICAFEMENU_CORE.posters_path(isLogin ? 'cafe_info_cafe_login.jpg' : 'cafe_info_cafe_background.jpg');
	// login/bg 用同一套解析规则（videos_path 内置素材本机有就走本机、没有才走 CDN；Customized 原样透传），避免分叉导致 remote UI 下 login 视频 404
	var globalVideo = ICAFEMENU_CORE.videos_path(isLogin ? (theSettings.client_login_video ?? '') : (theSettings.client_bg_video ?? ''));
	var imageLayers = urls => ({
		image: urls.concat(['images/games.jpg']).map(u => `url('${u.replace(/'/g, '%27')}')`).join(', '),
		video: '',
		preload: urls,
		fallback: null,
	});
	var defaultBg = format == 0 ? imageLayers([globalImage]) : { image: '', video: globalVideo, preload: [], fallback: null };

	var group = pc_group_background(type);
	if (!group)
		return defaultBg;
	if (group.isVideo)
		return { image: '', video: group.url, preload: [], fallback: group.posters ? defaultBg : null };
	return imageLayers([group.url, globalImage]);
}

/**
 * 显示 resolve_client_background 算出的背景。posters 约定视频可能不存在（视频元素自带黑底，不会像图片那样露出下一层），
 * 用一个隐藏的 video 元素探测，加载失败就改用 Default 的背景。不用 fetch 探测：本地加载是 file://，Chromium 一律拒绝 file:// 的 fetch。
 */
var theClientBackgroundSeq = 0; // 背景每切换一次加一，探测回来时背景已经换过就不再回退
function show_client_background(bg) {
	var seq = ++theClientBackgroundSeq;
	if (bg.image) {
		vueGlobal.backgroundImage = bg.image;
		theVideo.hide();
		return;
	}

	vueGlobal.backgroundImage = '';
	theVideo.play(bg.video);
	if (!bg.fallback)
		return;

	var probe = document.createElement('video');
	probe.muted = true;
	probe.preload = 'metadata';
	probe.onloadedmetadata = function () { probe.removeAttribute('src'); probe.load(); };
	probe.onerror = function () {
		if (seq == theClientBackgroundSeq)
			show_client_background(bg.fallback);
	};
	probe.src = bg.video;
}

// 锁屏、解锁、首页进入时统一应用游戏页背景，避免背景逻辑分散在多个页面中。
function apply_game_background_visual() {
	setBodyStyle();

	var birthdayAnimation = theSettings.birthday_animation ?? '';
	var isBirthday = is_member_birthday_today() && birthdayAnimation && birthdayAnimation.length > 0;

	if (isBirthday) {
		show_client_background({ image: '', video: ICAFEMENU_CORE.videos_path(birthdayAnimation), preload: [], fallback: null });
		return;
	}

	show_client_background(resolve_client_background('home'));
}

/**
 * notification before cafe closing
 * 1. 00:00 ~ 23:59 不启用
 * 2. notification_before_closing 必须大于0
 * @param {*} currentOffer 
 */

// 用 var 不用 const：顶层 const/let 跨 <script> 标签共享同一个全局词法环境，这个文件现在
// 只加载一次没有重复声明风险，但 var 允许被后来的同名声明静默覆盖，不会因为这个文件万一被
// 谁不小心又引用了第二次而直接抛 SyntaxError 崩掉整个文件的解析
var notification_shop_closing = throttle(() => {
	let start_time = theSettings.open_time_start ?? '00:00';
	let end_time = theSettings.open_time_end ?? '23:59';
	if (start_time == '00:00' && end_time == '23:59') {
		return;
	}

	if (typeof thePCStatus.notification_before_closing == 'undefined') {
		let hours_mins = end_time.split(':');
		let end_date = new Date();
		end_date.setHours(parseInt(hours_mins[0]), parseInt(hours_mins[1]), 0, 0);
		if (end_date < new Date()) {
			end_date.setDate(end_date.getDate() + 1);
		}
		thePCStatus.notification_before_closing = JSON.parse(theSettings.notification_before_closing)
			.filter(min => min > 0)
			.map(min => end_date.getTime() - min * 60 * 1000)
	}

	if (thePCStatus.notification_before_closing.filter(ts => ts <= Date.now()).length == 0) {
		return;
	}
	thePCStatus.notification_before_closing = thePCStatus.notification_before_closing.filter(ts => ts > Date.now());

	let mute = translate_string("Mute alert");
	let msg = translate_string("The shop is closing soon");
	let $toast = toast(msg + `<br><a class="toast-mute-alert" href="javascript:;" style="font-size:12px; color:blue;">${mute}</a>`, 'warning');
	$toast.find("a.toast-mute-alert").click(() => {
		thePCStatus.notification_before_closing = [];
	})
	let license_lang = theSettings.license_lang ?? '';
	const supportedLangs = ['ar', 'es', 'mn', 'ru', 'tr_TR'];
	const wav = "admin-message.wav";
	license_lang = supportedLangs.includes(license_lang) ? (license_lang + "/") : '';

	ICAFEMENU_CORE.playSound([`customized/${wav.trim()}`, `${license_lang}${wav.trim()}`]);

}, 2000);

/**
 * alert client / admin
 * 记录 alert_client_before_end ，只有当 left_mins <= max(alert_client_before_end) 时，才会提醒，之后就移除 >=left_mins 的元素
 * client time left alert
 * @param {*} currentOffer 
 */
var alertPcTimeLeft = throttle((currentOffer) => {
	let left_mins = Math.ceil(currentOffer.left_secs / 60);
	if (left_mins < 1) return;
	
	let storeKey = currentOffer.time_type == 'balance' ? `balance_${thePCStatus.member_id}` : currentOffer.member_offer_id
	if (!storeKey) return;

	storeKey = `alert_offer_before_end_${storeKey}`;
	let storedAlert = sessionStorage.getItem(storeKey);
	if (!storedAlert) {
		storedAlert = theSettings.alert_client_before_end;
	}

	storedAlert = JSON.parse(storedAlert)
	let alert_client_last_minutes = Math.max.apply(null, storedAlert)
	
	if (left_mins <= alert_client_last_minutes) {
		sessionStorage.setItem(storeKey, JSON.stringify(storedAlert.filter(min => min < left_mins ) )); // 这里把 >= left_mins 的都移除了，所以不会重复通知

		let mute = translate_string("Mute alert");
		let message = '';
		if (currentOffer.time_type == 'offer')
			message = translate_string('{0} offer will be expired in {1} minutes, auto switch to balance mode').replace('{0}', currentOffer.name).replace('{1}', left_mins)
		else
			message = translate_string("Your remaining time is less than {0} minutes").replace('{0}', left_mins);
		let $toast = toast(message + `<br><a class="toast-mute-alert" href="javascript:;" style="font-size:12px; color:blue;">${mute}</a>`, 'warning');
		
		$toast.find("a.toast-mute-alert").click(()=>{
			sessionStorage.setItem(storeKey, JSON.stringify([]));
		})

		let license_lang = theSettings.license_lang ?? '';
		const supportedLangs = ['ar', 'es', 'mn', 'ru', 'tr_TR'];
		const wav = left_mins <= 5 ? left_mins + "min_left.wav " : "admin-message.wav";
		license_lang = supportedLangs.includes(license_lang) ? (license_lang + "/") : '';

		ICAFEMENU_CORE.playSound([`customized/${wav.trim()}`, `${license_lang}${wav.trim()}`]);
	}
}, 2000);


function countdown() {
	// 会话被柜台暂停：停在原地，不倒计时也不自报 auto_checkout。
	// 暂停期间 status_disconnect_time 保持真值不动，剩余时间本来就不多的会话会走到负数，
	// 若照常自报会被服务端当成到期处理（服务端也有对应的跳过，这里是客户端侧的第一道）。
	if (thePCStatus.is_paused == 1)
		return;

	if (thePCStatus.status_connect_time_left < 0) {
		// The end of the countdown does not mean the customer time is all used up, because the customer may have offers and balance.
		// send auto_checkout package to wss server, the wss server will send client_status package to me after switch to another offer or balance.
		ICAFEMENU_CORE.wsssend('auto_checkout', 'request', 'wss-server', {});
		clearInterval(theCountDownIntervalId);
		theCountDownIntervalId = null;
		// 若超时内未收到服务端 client_status 回应，退回登录页。
		// 只在没有兜底计时器在跑时才新建一个——WSS 重连/其它状态推送会触发 wss_client_status()
		// 重新调用 countdown_start()，如果这里每次都无条件重置计时器，deadline 会被不断往后推，
		// 5 分钟兜底就永远等不到触发的那一刻（生产环境出现过 status_connect_time_left 一直卡在
		// 负数、长时间未能退回登录页的情况，根因就是这个计时器被反复重置）
		if (!theAutoCheckoutTimeoutId) {
			var timeoutMins = parseInt((theSettings.client_connection_timeout_mins) || 5);
			theAutoCheckoutTimeoutId = setTimeout(function() {
				theAutoCheckoutTimeoutId = null;
				theSession.logout_session();
			}, timeoutMins * 60 * 1000);
		}
		return;
	}

	if (thePCStatus.member_group_id == MEMBER_GROUP_POSTPAID || thePCStatus.member_group_id == MEMBER_GROUP_FREE) {
		memberInfo.postpaid_pc_name = thePCStatus.pc_name;
		// ui_init() 会把整个 body 重新翻译一遍并重绑 tooltip，这是每秒一次的重活，
		// 省电模式下（玩家在游戏里）跳过，切回菜单时下一个 tick 自然补上
		if (!thePowerSave.active) {
			PetiteVue.nextTick(() => {
				ui_init();
				$('[data-toggle="tooltip"]').tooltip();
			});
		}

		// 默认的free/postpaid是真不限时，累计显示"已用时长"更合理；但如果开机时对话框现场指定了具体
		// 时长（session_has_duration_limit，服务端根据member_extra.session_expire算出来的），那就是
		// 一个跟普通余额会话一样有真实到期时间的会话，应该跟其它会话一样倒计时——下面的通用倒计时逻辑
		// （total/in_using行每tick -1）本来就是对的，这里跳过累计只是为了不覆盖它。
		if (!thePCStatus.session_has_duration_limit) {
			thePCStatus.status_connect_time_duration += 1;  // if postpaid, show time used
			if (theAvailableOffers.length > 0)
				theAvailableOffers[0].left_secs = thePCStatus.status_connect_time_duration;
		}
	}

	// 剩余时间是计时器，省电模式下也照走：「有游戏在跑」不等于玩家没在看菜单（Chrome/Discord/
	// 罗技 G Hub 这类常驻程序也在游戏列表里），冻住就是「剩余时间不动」的投诉。
	// 省电模式下只原地改文本和进度，不重建列表，把每秒的重绘压到最小。
	if (thePowerSave.active)
		sync_offers_timer();
	else
		sync_offers_display();

	let is_last_offer = theAvailableOffers.length == 3 && theAvailableOffers[1].time_type == 'offer' && theAvailableOffers[1].in_using && theAvailableOffers[2].time_type == 'balance' 
	is_last_offer = is_last_offer || theAvailableOffers.length == 2 && theAvailableOffers[1].time_type == 'offer' && theAvailableOffers[1].in_using 
	is_last_offer = is_last_offer || theAvailableOffers.length == 2 && theAvailableOffers[1].time_type == 'balance'
	if (((theSettings.alert_for_last_offer ?? 0) == 1 && is_last_offer)) // total, last offer, balance
	{
		alertPcTimeLeft( theAvailableOffers[1]);
	}

	// 这个不能钳：必须允许减到 -1，下一个 tick 顶部的守卫才会发 auto_checkout
	thePCStatus.status_connect_time_left -= 1;

	for (var i = 0; i < theAvailableOffers.length; i++) {
		if (theAvailableOffers[i].time_type === 'total' || theAvailableOffers[i].in_using) {
			// 这里必须钳到 0：顶部的守卫只看 status_connect_time_left，管不到这几行。
			// TOTAL / 其它 offer 行的初值和 session 到期时间来自不同的源，只要两边对不齐，
			// TOTAL 就会比 session 先到 0，然后在守卫触发之前一路负下去，
			// 界面上就是持续变大的负数倒计时（现场出现过 0:00:-14 / 0:-4:00）。
			// 服务端 inc.php 已经改成给在用 offer 下发会话实时剩余，这里是显示层兜底，
			// 也挡住老版本 wsserver 推来的旧数据。
			theAvailableOffers[i].left_secs = Math.max(0, theAvailableOffers[i].left_secs - 1);
		}
	}
	
	notification_shop_closing();
}

/* ===================== 省电模式（power save）=====================
 * 客户投诉「开了 iCafeMenu 之后游戏掉帧」（同一台机器 admin 模式 200fps，iCafe 模式
 * 只有 30~70fps）的根因：客户端 CEF 以 --disable-gpu --disable-gpu-compositing 启动，
 * 所有渲染走软件路径，而玩家进游戏之后菜单界面虽然没人看，却还在原速继续跑——背景/公告
 * 视频解码、公告 carousel 的淡入淡出、闪电边框旋转。每一次刷新都要 CPU 把对应区域重新光栅化一遍（主题里大量使用 backdrop-filter，
 * 重绘时还要连带把背后的内容重新模糊一次），这些开销直接从游戏的帧率里扣。
 *
 * 规则很简单：有游戏在运行（RUNGAME_IDS 返回非空，listen.js 每 3 秒查一次，也是本模块的
 * 心跳）就进省电模式，没有游戏在运行就退出。
 *
 * 省电模式只冻结「动起来要花 CPU」的东西，不改任何影响观感的属性（backdrop-filter、阴影、
 * 颜色一律不动），所以退出省电模式时界面跟平时长得一模一样，只是刚才暂时不动。
 *
 * 例外：计时器（顶栏时钟、剩余时间/进度）不冻结。只看「有游戏在跑」判断不了玩家有没有在看
 * 菜单——Chrome/Discord/罗技 G Hub 这类程序也在游戏列表里且常驻后台，冻住计时器，玩家
 * 盯着菜单看到的就是一个不动的剩余时间（Asana #1219178691174724）。每秒一次的小块文字
 * 重绘代价很小，省电的收益主要在视频/轮播/动画上。
 */
var thePowerSave = {
	active: false,
	paused_carousels: null
};

/**
 * 心跳：由 listen.js 的 RUNGAME_IDS 回调（每 3 秒一次）驱动。
 * @param {boolean} game_running 有没有游戏在运行
 */
function power_save_tick(game_running) {
	power_save_set(!!game_running);
}

function power_save_set(on) {
	on = !!on;

	if (on != thePowerSave.active) {
		thePowerSave.active = on;
		vueGlobal.powerSave = on;   // youtube 背景 iframe 靠这个卸载/重载（iframe 没法直接 pause）
		document.documentElement.classList.toggle('icafe-power-save', on);
		power_save_carousels(on);

		if (!on) {
			power_save_resume_videos();
			sync_offers_display();   // 省电期间只原地改了文本，回来完整同步一次
		}
	}

	// 暂停视频这步每个心跳都跑一遍（幂等）：省电期间界面仍可能因为 wss 推送重新渲染，
	// petite-vue 重建出来的 <video autoplay> 会自己开始播放，要在下一个心跳重新按住。
	if (on)
		power_save_pause_videos();
}

function power_save_pause_videos() {
	document.querySelectorAll('video').forEach(function (v) {
		if (v.paused)
			return;
		v.dataset.powerSavePaused = '1';   // 只恢复我们自己暂停过的，别把用户手动停掉的又播起来
		v.pause();
	});
}

function power_save_resume_videos() {
	document.querySelectorAll('video').forEach(function (v) {
		if (!v.dataset.powerSavePaused)
			return;
		delete v.dataset.powerSavePaused;
		var p = v.play();
		if (p && p.catch)
			p.catch(function () {});
	});
}

// bootstrap carousel 的自动轮播：每轮一次 .carousel-fade 透明度过渡，600ms 的大面积重绘。
// 只动此刻真的在自动轮播的那些（data-interval="false" 的本来就不转，别把它们"恢复"成会转）。
function power_save_carousels(on) {
	if (typeof $ == 'undefined' || !$.fn || !$.fn.carousel)
		return;

	try {
		if (on) {
			thePowerSave.paused_carousels = $('.carousel').filter(function () {
				var data = $(this).data('bs.carousel');
				return data && data.interval;
			});
			thePowerSave.paused_carousels.carousel('pause');
		} else if (thePowerSave.paused_carousels) {
			thePowerSave.paused_carousels.carousel('cycle');
			thePowerSave.paused_carousels = null;
		}
	} catch (e) {
		console.warn('[power save] carousel', e);
	}
}

function offer_display_percent(item) {
	if (!(item.total_secs > 0))
		return 0;
	return Math.min(Math.max(parseInt((item.left_secs / item.total_secs) * 100.0), 0), 100);
}

/**
 * 省电模式下的轻量版：只把剩余秒数/文本/进度原地写进已有的 vueAvailableOffers.items，
 * 不整表替换（整表替换会让 petite-vue 重建整个列表 DOM）。行数或行类型对不上
 * （期间 wss 推了新状态）就退回完整同步。
 */
function sync_offers_timer() {
	var items = vueAvailableOffers.items;
	if (!items || items.length != theAvailableOffers.length) {
		sync_offers_display();
		return;
	}
	for (var i = 0; i < items.length; i++) {
		if (items[i].time_type !== theAvailableOffers[i].time_type) {
			sync_offers_display();
			return;
		}
	}
	for (var i = 0; i < items.length; i++) {
		var src = theAvailableOffers[i];
		if (items[i].left_secs === src.left_secs && items[i].total_secs === src.total_secs)
			continue;
		items[i].left_secs = src.left_secs;
		items[i].total_secs = src.total_secs;
		items[i].percent = offer_display_percent(src);
		items[i].remaining = format_time(src.left_secs);
	}
}

/**
 * 倒计时里纯展示的那部分：把 theAvailableOffers 同步进 vueAvailableOffers.items 并算好
 * 进度条百分比和剩余时间文本。跟计费逻辑无关。
 */
function sync_offers_display() {
	vueAvailableOffers.items = JSON.parse(JSON.stringify(theAvailableOffers));

	for (var i = 0; i < vueAvailableOffers.items.length; i++) {
		vueAvailableOffers.items[i].percent = offer_display_percent(vueAvailableOffers.items[i]);
		vueAvailableOffers.items[i].remaining = format_time(vueAvailableOffers.items[i].left_secs);
	}

	// Offers carousel 切换已改用 Vue 响应式状态 (vueAvailableOffers.currentIndex) 驱动
	// 见 prevOffer() / nextOffer() 方法
	if (vueAvailableOffers.currentIndex >= vueAvailableOffers.items.length)
		vueAvailableOffers.currentIndex = 0;
}

function SmsClass() {
	// 获取手机验证码
	// type: 'register' or 'convert'
	this.sendCode = function (type) {
		type = type || 'register';
		
		var phone = '';
		if (type == 'register') {
			phone = vueRegister.phone;
		} else if (type == 'convert') {
			phone = vueLayout.convertPhone;
		}


		if (!phone) {
			sweetAlert("", translate_string("Please enter your mobile phone number!"), "error");
			return false;
		}
		
		vueGlobal.sms.disabled = true;
		const smsIcafeId = theCafe.id ?? false;

		// let api = "https://" + theSettings.license_info.license_server_code + ".icafecloud.com/api/v2/auth/smsCode";
		const api = getCafeApiUrl('smsCode', 'auth');

		$.ajax({
			url: api,
			method: 'get',
			dataType: 'json',
			data: {
				cafe_id: smsIcafeId,
				phone_number: phone
			},
			success: (data) => {
				console.log(JSON.stringify(data));
				if (data.code == 200) {
					this.smsCountDown();
				} else {
					data.message ? sweetAlert('', translate_string(data.message), 'error') : sweetAlert('', translate_string('Fail in send!'), 'error');
					// 使用 Vue 响应式状态替代 jQuery DOM 操作
					vueGlobal.sms.disabled = false;
				}
			},
			error(data) {
				console.log(JSON.stringify(data));
				data.message ? sweetAlert('', translate_string(data.message), 'error') : sweetAlert('', translate_string('Fail in send!'), 'error');
				vueGlobal.sms.disabled = false;
			}
		});
	}

	// 验证短信验证码是否匹配
	this.verifySmscode = function (callback) {
		// 使用 Vue 响应式状态替代 jQuery DOM 操作
		var phone = vueRegister.phone;
		var member_sms_code = vueRegister.member_sms_code;
		// let api = "https://" + theSettings.license_info.license_server_code + ".icafecloud.com/api/v2/auth/checkSmsCode";
		let api = getCafeApiUrl('checkSmsCode', 'auth');
		$.ajax({
			url: api,
			method: "get",
			data: { type: 'check_sms_code', phone_number: phone, member_sms_code: member_sms_code, cafe_id: theCafe.id },
			dataType: "json",
			success: (data) => {
				console.log(JSON.stringify(data));
				if (data.code == 200) {
					callback(data);
				}
				else {
					callback(data);
				}
			},
			error: (data) => {
				console.log(JSON.stringify(data));
				sweetAlert("", translate_string('SMS verification code mismatch'), "error");
				return;
			}
		});
	}

	// 短信倒计时
	this.smsCountDown = function () {
		var seconds = 60;
		vueGlobal.sms.text = seconds;
		var timer = setInterval(function () {
			seconds--;
			vueGlobal.sms.text = seconds;
			if (seconds <= 0) {
				clearInterval(timer);
				vueGlobal.sms.text = 'Again';
				vueGlobal.sms.disabled = false;
			}
		}, 1000);
	}
}

// 把本机绝对路径（C:\xxx、C:/xxx、/C:/xxx）或网络共享（\\server\share\xxx、//server/share/xxx）转成 file:// URL；
// 其它值（http(s)、已经是 file:// 等）原样返回。Video.play() 和 pc_group_background() 的图片分支共用，本地路径识别规则只写一处。
function resolve_local_file_url(source) {
	source = (source || '').trim();
	if (/^file:\/\//i.test(source))
		return source;
	if (/^\/?[a-zA-Z]:[\\\/]/.test(source)) {
		// 本机绝对路径：允许管理员自然地用反斜杠输入（Windows 习惯），统一转成正斜杠再拼 file:///
		return 'file:///' + source.replace(/^\//, '').replace(/\\/g, '/');
	}
	if (/^\\\\[^\\]/.test(source) || /^\/\/[^\/]/.test(source)) {
		// 网络共享：\\server\share\xxx 或 //server/share/xxx -> file://server/share/xxx
		return 'file://' + source.replace(/^[\\\/]{2}/, '').replace(/\\/g, '/');
	}
	return source;
}

function Video() {
	var that = this;

	this.stop = function () {
		vueGlobal.videoBackground.src = '';
		vueGlobal.videoBackground.visible = false;
		return;
	}

	// 注意这里必须连 src 一起清掉，光把 visible 置 false 是不够的：v-show 只是
	// display:none，而 display:none 的 <video> 在 Chromium 里照常播放、照常解码
	// （实测 currentTime continues to advance）。两处调用点——登录页用图片背景
	// （login.js）、游戏页用图片背景（apply_game_background_visual）——要的都是
	// "不要视频"，此前视频一直在后台解码，白烧一份 CPU，软件渲染下直接影响游戏帧率。
	this.hide = function () {
		this.stop();
	}

	this.play = function (source) {
		this.stop();
		this.hide();
		

		// 检查source是否有效，如果为空则不显示视频，fallback到默认背景图片
		if (!source || source.trim() === '' || source.endsWith('/')) {
			console.log('[Video] Invalid or empty source, falling back to default background');
			// 设置默认背景图片作为fallback
			vueGlobal.backgroundImage = `url('${ICAFEMENU_CORE.posters_path('cafe_info_cafe_login.jpg')}'), url('images/games.jpg')`;
			return;
		}

		// 自动补全本机绝对路径/网络共享的 file:// 协议（C:\xxx、C:/xxx、/C:/xxx、\\server\share\xxx 等）
		source = resolve_local_file_url(source);

		var youtubeId = youtube_video_id(source);
		if (youtubeId) {
			vueGlobal.videoBackground.type = 'youtube';
			vueGlobal.videoBackground.src = youtube_embed_url(youtubeId);
			vueGlobal.videoBackground.visible = true;
			return;
		}

		vueGlobal.videoBackground.type = 'url';
		vueGlobal.videoBackground.src = source;
		vueGlobal.videoBackground.visible = true;
	}
}

function ui_init(translate = true) {
	if (translate)
		translate_obj($('body'));
	$('label').bind('mouseenter', function(e) {
		var target = e.target;
		var $target = $(target);
		
		if (target.offsetWidth < target.scrollWidth) {
			// 检查是否已经有tooltip数据
			if (!$target.data('bs.tooltip')) {
				// 保存原始文本作为tooltip内容
				var titleText = $target.text();
				
				// 方法1：使用原生title属性（最简单）
				$target.attr('title', titleText);
				
				// 初始化Bootstrap tooltip
				$target.tooltip({
					trigger: 'hover',  // 使用hover触发
					placement: 'bottom'
				});
				
				// 关键：手动触发一次tooltip显示
				// 使用setTimeout确保tooltip已初始化
				setTimeout(function() {
					if ($target.is(':hover')) {  // 确保鼠标还在元素上
						$target.tooltip('show');
					}
				}, 50);
			}
		}
	});
}

function run_protect(protection_settings) {
	if (protection_settings == null) {
		ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\cmd\\allow.bat"');
		ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\control_panel\\allow.bat"');
		ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\download_file\\allow.bat"');
		ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\power_button\\allow.bat"');
		//ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\regedit\\allow.bat"');
		ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\usb\\allow.bat"');
		ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\task_manager\\allow.bat"');
		return;
	}

	protection = JSON.parse(protection_settings);

	ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\cmd\\' + (protection.cmd ? 'deny.bat"' : 'allow.bat"'));
	ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\control_panel\\' + (protection.control_panel ? 'deny.bat"' : 'allow.bat"'));
	ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\download_file\\' + (protection.download_file ? 'deny.bat"' : 'allow.bat"'));
	ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\power_button\\' + (protection.power_button ? 'deny.bat"' : 'allow.bat"'));
	//ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\regedit\\' + (protection.regedit ? 'deny.bat"' : 'allow.bat"'));
	ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\usb\\' + (protection.usb ? 'deny.bat"' : 'allow.bat"'));
	ICAFEMENU_CORE.sendCommandToExe('RUNSCRIPT "{tools}\\protection\\task_manager\\' + (protection.task_manager ? 'deny.bat"' : 'allow.bat"'));
}

function shutdown_click() {
	vueGlobal.modals.confirmShutdown = true;
}

function reboot_click() {
	vueGlobal.modals.confirmReboot = true;
}

function confirm_shutdown_submit() {
	ICAFEMENU_CORE.sendCommandToExe('SHUTDOWN ONLY');
}

function confirm_reboot_submit() {
	ICAFEMENU_CORE.sendCommandToExe('SHUTDOWN REBOOT');
}

function format_datetime(s) {
	var date = new Date(s);
	if (isNaN(date))
		return '';

	var d = date.getDate();
	var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
	var y = date.getFullYear().toString().substr(2);

	var h = date.getHours();
	if (h < 10)
		h = '0' + h;
	var min = date.getMinutes();
	if (min < 10)
		min = '0' + min;

	return d + ' ' + m + ' ' + y + ' ' + h + ':' + min;
}

function copyToClipboard(id,opt) {
	var clipboard = new ClipboardJS(id,opt);
	clipboard.on('success', function (e) {
		// opt 是可选参数——绝大多数调用点（license 账号/密码复制、会员登录/注册复制、QR 静态链接
		// 复制等）都只传 id，不传第二个参数，opt 本身就是 undefined，此时直接读 opt.toast 会抛
		// TypeError，导致整个 success 回调（含 e.clearSelection()）都不执行
		if(opt && opt.toast){
			// 项目里没有全局 toast() 函数，实际用的提示库是 toastr（见 listen.js/game.js 等），
			// 这里之前调的是一个根本不存在的函数，opt.toast=true 的调用点（shop.js 的 QR 支付
			// 复制）一旦走到这个分支必定抛 ReferenceError
			toastr.success(translate_string('Copied succeed'))
		}else{
			sweetAlert({
				title: translate_string('Succeed'),
				text: translate_string('Copied'),
				type: 'success'
			});	
		}
		e.clearSelection();
	});
}

// 原来定义在 home.js，但内容是拉取会员余额+更新全局共享的 memberInfo 对象，跟"首页"这个概念
// 无关，实际被 game.js/login.js/shop.js 三个页面调用，是没有单一归属页面的通用工具，挪过来更合适
async function refreshBalanceInfo(member_account = '') {
	const member_info = await theApiClient.callCafeApi('getRealTimeBalance', 'POST', {
		member_account: member_account || thePCStatus.member_account,
		pc_name: thePCInfo.pc_name
	}).catch(ICafeApiError.skip)
	// 接口失败（如 token 401）时 member_info 为 undefined，提前 return，避免打印出误导性的
	// "member_balance=undefined"（看起来像查到了会员但余额是 undefined，实际是整个请求都没成功）
	if (!member_info)  return
	console.log('refresh balance info: member_account='+member_account+';thePCStatus.member_account='+thePCStatus?.member_account+';member_balance=' + member_info?.member_balance)
	var member_balance = member_info.member_balance ?? 0;
	memberInfo.member_balance_realtime = formatBigNumber(member_balance);
	memberInfo.member_balance = member_balance;

	var member_balance_bonus = member_info.member_balance_bonus ?? 0;
	memberInfo.member_balance_bonus_realtime = formatBigNumber(member_balance_bonus);
	memberInfo.member_balance_bonus = member_balance_bonus;

	var member_coin_balance = member_info.member_coin_balance ?? 0;
	memberInfo.member_coin_balance = formatBigNumber(member_coin_balance);

	var member_loan = member_info.member_loan ?? 0;
	memberInfo.member_loan_raw = member_loan;
	memberInfo.member_loan = formatBigNumber(member_loan);

	var price_per_hour = member_info.price_per_hour ?? 0;
	memberInfo.price_per_hour = formatBigNumber(price_per_hour);

	var pc_cost = member_info.pc_cost ?? 0;
	memberInfo.pc_cost_raw = pc_cost;
	memberInfo.pc_cost = formatBigNumber(pc_cost);

	setTimeout(() => {}, 0);
}

function formatBigNumber(balance) {
	var balance_realtime = formatNumber(parseFloat(balance));
	if (balance > 1000000)
		balance_realtime = formatNumber(balance / 1e6) + "M";

	return balance_realtime;
}
// 获取接口地址:/cafe/xxxx/uri
function getCafeApiUrl(uri, type = 'cafe') {
	// 优先thePCStatus，因为有可能切换服务器
	console.log('api ' + uri);
	var license_server_code = thePCStatus.license_server_code ?? theSettings.license_info.license_server_code;
	if (type == 'auth') {
		return "https://" + license_server_code + ".icafecloud.com/api/v2/auth/" + uri;
	} else {
		return "https://" + license_server_code + ".icafecloud.com/api/v2/cafe/" + theCafe.id + "/" + uri;
	}
}

function unlock_pc() {
	// 登录页上绝不按 license_show_client_mode 改窗口/放开任务栏：show_login_page() 末尾会调到这里，
	// 而调用方（比如 WSS_LOGIN_FAILED、会话中打开 admin_exit）可能还没清掉 thePCStatus.member_account，
	// 这时按"仍在登录"处理会把刚下的 LOCK 65535 / 全屏 / 置顶整套撤掉——登录页露出任务栏、窗口不全屏的根因。
	if (is_logined() && vueGlobal.currentView !== 'login') {
		if (theSettings.license_show_client_mode == 'full screen') {
			ICAFEMENU_CORE.sendCommandToExe("SETWINDOWSIZE -3*-3"); // no topmost
			theLastWindowSize = "-3*-3";
			ICAFEMENU_CORE.sendCommandToExe("SETWINDOWTOPMOST 0");
		}

		if (typeof (theSettings.license_show_client_mode) == 'undefined' || theSettings.license_show_client_mode == 'maximized') {
			ICAFEMENU_CORE.sendCommandToExe("SETWINDOWSIZE -2*-2");
			theLastWindowSize = "-2*-2";
		}

		if (theSettings.license_show_client_mode == 'minimized') {
			ICAFEMENU_CORE.sendCommandToExe("SETWINDOWSIZE -2*-2");
			theLastWindowSize = "-2*-2";
			ICAFEMENU_CORE.sendCommandToExe("HIDEWINDOW");
		}

		/*
			TASKMGR  = 0x01,	// disable task manager (Ctrl+Alt+Del)
			TASKKEYS = 0x02,	// disable task keys (Alt-TAB, etc)
			TASKBAR  = 0x04,	// disable task bar
			LOGOFF   = 0x08,	// disable task bar
			WINKEYS	 = 0x10,	// disable windows keys
		*/

		ICAFEMENU_CORE.sendCommandToExe("UNLOCK 3"); // unlock alt+tab after login, user want to switch in game
		if (theSettings.license_show_client_mode != 'full screen')
			ICAFEMENU_CORE.sendCommandToExe("UNLOCK 4"); // only enable taskbar
		if (theSettings.client_winkeys_enable != 0)
			ICAFEMENU_CORE.sendCommandToExe("UNLOCK 16"); // unlock windows keys after login
	}

	// Don't clear system-imposed locks (station_lock/maintenance).
	// Those are cleared only via client_status when pc_enabled returns to 1.
	if (vueGlobal.lockMode !== 'maintenance' && vueGlobal.lockMode !== 'station_lock') {
		vueGlobal.isLocked = false;
		theLockScreen.stop_countdown();
		if (is_logined()) {
			// 已登录用户解锁后，恢复游戏页背景与页面样式。
			apply_game_background_visual();
			vueGlobal.bodyClass = 'bd-game-page';
		}
	}
	// 按钮禁用状态通过模板中 :disabled="vueGlobal.isLoading" 绑定控制
}

/**
 * 获取所有支持的游戏配置
 * 返回数组，每个元素包含 key, name, matchStatsType, rankOptionKey
 */
function getSupportedGames() {
	return [
		{ key: 'fortnite', name: 'Fortnite', matchStatsType: 'fortnite-match-stats', rankOptionKey: 'game_rank_options_fortnite' },
		{ key: 'pubg', name: 'PUBG', matchStatsType: 'pubg-match-stats', rankOptionKey: 'game_rank_options_pubg' },
		{ key: 'dota2', name: 'Dota 2', matchStatsType: 'dota2-match-stats', rankOptionKey: 'game_rank_options_dota2' },
		{ key: 'csgo', name: 'CS:GO', matchStatsType: 'csgo-match-stats', rankOptionKey: 'game_rank_options_csgo' },
		{ key: 'valorant', name: 'Valorant', matchStatsType: 'valorant-match-stats', rankOptionKey: 'game_rank_options_valorant' },
		{ key: 'lol', name: 'League of Legends', matchStatsType: 'lol-match-stats', rankOptionKey: 'game_rank_options_lol' },
		{ key: 'apex', name: 'Apex Legends', matchStatsType: 'apex-match-stats', rankOptionKey: 'game_rank_options_apex' },
		{ key: 'custom', name: 'Custom', matchStatsType: 'custom-match-stats', rankOptionKey: 'game_rank_options_custom' }
	];
}

/**
 * 获取已启用的游戏（根据theSettings中的game_rank_options_xx）
 */
function getEnabledGames() {
	return getSupportedGames().filter(game => {
		// 如果 theSettings[game.rankOptionKey] 明确为 0，则过滤掉，否则视为启用
		return theSettings[game.rankOptionKey] !== 0;
	});
}

// getGameNameByMatchStatsType 原来这里也有一份，全局零调用——是"游戏名称家族"里唯一没人用的
// 一个（兄弟函数 getSupportedGames/getEnabledGames/getGameCode2Names 都有真实调用方），删掉。

/**
 * 获取 gamecode2names 数组（用于 events）
 */
function getGameCode2Names() {
	// 所有的支持游戏
	const arr = getSupportedGames().map(g => ({ code: g.key, name: g.name }));
	// 只包含已启用的游戏
	const enabledGames = getEnabledGames();
	arr.push({ code: 'all', name: enabledGames.map(g => g.name).join(', ') });
	return arr;
}

function formatNumber(number) {
	if (typeof number === 'undefined') 
		return '';
	const decimalConfig = Number(theSettings.shop_show_decimal || 2);
	// 历史遗留：旧值1对应2位小数，旧值2对应1位小数
	const decimalMap = { 0: 0, 1: 2, 2: 1, 3: 3 };
	const fractionDigits = decimalMap[decimalConfig] ?? 2;
	const fractionOptions = {minimumFractionDigits: fractionDigits,	maximumFractionDigits: fractionDigits};

	// en-US	1,234,567.89
	// de-DE	1.234.567,89
	// fr-FR	1 234 567,89
	// ru-RU	1 234 567,89
	const supportedLangs = {'en': 'en-US', 'ar': 'ar-AR', 'es': 'es-ES', 'mn': 'mn-MN', 'ru': 'ru-RU', 'tr_TR': 'tr-TR', 'fr': 'fr-FR'};
	const language = supportedLangs[theSettings.license_lang || 'en-US'] ?? 'en-US';
	return Number(number).toLocaleString(language, fractionOptions);
}

// ===== promo code 自动预览（PromoController::preview）=====
// 只计算不使用，提交逻辑不变。全部在 core 里完成，主题模板不用改：各主题的 promo 输入框都
// v-model 到 vueTopupLogin（访客充值）/ vueTopup（会员充值、商城充值）/ vueRegister（注册），
// 这里在 document 上监听 input/click，发现某个表单的 promo_code 或充值金额变了，就停顿 500ms
// 自动预览（与 CP 结账弹窗一致），并在输入框后面插一行原生 DOM 显示结果。新加的主题自动生效。
// 回车保持主题原来的行为（提交表单），提交时 getTopupUrl / 注册接口照旧校验。

var _promo_preview_timers = new WeakMap();   // form -> 防抖计时器
var _promo_preview_seen = new WeakMap();     // form -> 上次看到的 {code, amount}
var _promo_preview_inputs = new WeakMap();   // form -> 最近一次输入 promo 的 <input>

function promo_preview_forms() {
	const forms = [];
	if (typeof vueTopupLogin !== 'undefined') forms.push([vueTopupLogin, 'topup']);
	if (typeof vueTopup !== 'undefined') forms.push([vueTopup, 'topup']);
	if (typeof vueRegister !== 'undefined') forms.push([vueRegister, 'register']);
	return forms.filter(([form]) => form && typeof form === 'object');
}

// 自助充值走 getTopupUrl，付的是含税金额，所以 topup 场景带 tax_included=1
async function promo_preview_apply(form, scene) {
	const promo_code = (form.promo_code || '').trim();
	if (!promo_code) {
		form.promo_preview = null;
		promo_preview_render(form, null);
		return null;
	}
	const amount = scene == 'topup' ? (parseFloat(form.topup_amount) || 0) : 0;
	const data = await theApiClient.callCafeApi('promoPreview', 'POST', {
		promo_code: promo_code,
		scene: scene,
		amount: amount,
		member_account: form.member_account || '',
		tax_included: scene == 'topup' ? 1 : 0,
	}).catch(() => null);
	// 请求返回前又改了码，丢弃旧结果
	if (!data || promo_code !== (form.promo_code || '').trim())
		return null;
	form.promo_preview = data;
	promo_preview_render(form, data);
	return data;
}

// 在 promo 输入框后面显示 / 移除结果行。返回是否显示出来了（不知道输入框在哪时为 false）
function promo_preview_render(form, res) {
	const input = _promo_preview_inputs.get(form);
	if (!input || !input.isConnected)
		return false;
	let line = input._promoPreviewLine;
	if (!res) {
		if (line) line.remove();
		input._promoPreviewLine = null;
		return false;
	}
	if (!line || !line.isConnected) {
		line = document.createElement('div');
		input.insertAdjacentElement('afterend', line);
		input._promoPreviewLine = line;
	}
	const d = promo_preview_display(res);
	line.className = 'small mt-1 ' + d.cls;
	line.textContent = d.text;
	return true;
}

// 表单 reset() 时调用，清掉结果行和记录
function promo_preview_clear(form) {
	clearTimeout(_promo_preview_timers.get(form));
	promo_preview_render(form, null);
	_promo_preview_seen.delete(form);
}

// v-model 的监听挂在输入框自己身上，冒泡到 document 时表单值已经更新。
// 快捷金额按钮是 click 里改 topup_amount，等这一轮事件处理完再看
function promo_preview_watch(target) {
	for (const [form, scene] of promo_preview_forms()) {
		const code = (form.promo_code || '').trim();
		const amount = scene == 'topup' ? String(form.topup_amount ?? '') : '';
		const seen = _promo_preview_seen.get(form) || {code: '', amount: ''};
		if (code === seen.code && amount === seen.amount)
			continue;
		_promo_preview_seen.set(form, {code: code, amount: amount});
		const code_changed = code !== seen.code;
		if (code_changed) {
			// 记下 promo 输入框：本次事件的输入框，且内容就是这个表单的 promo_code
			if (target && target.tagName === 'INPUT' && (target.value || '').trim() === code)
				_promo_preview_inputs.set(form, target);
			// 改了码先撤掉旧结果，免得显示的是上一个码的结论
			form.promo_preview = null;
			promo_preview_render(form, null);
		}
		clearTimeout(_promo_preview_timers.get(form));
		if (code)
			_promo_preview_timers.set(form, setTimeout(() => promo_preview_apply(form, scene), 500));
	}
}

document.addEventListener('input', e => promo_preview_watch(e.target));
document.addEventListener('click', () => setTimeout(() => promo_preview_watch(null), 0));

// 预览结果 → 结果行的文案和颜色（与 CP 各页面的 promo_display 一致）
function promo_preview_display(res) {
	if (!res)
		return {cls: '', text: ''};
	if (!res.valid)
		return {cls: 'text-danger', text: translate_string(res.message || 'Promo code does not exist')};
	// 与充值档位 bonus 发到同一字段时取较大值，promo 不比档位多就不会被使用
	if (!res.will_apply)
		return {cls: 'text-warning', text: translate_string('Topup bonus is higher than the promo bonus, the promo code will not be used')};

	const label = translate_string({bonus: 'Bonus', coin: 'Coin', balance: 'Balance'}[res.promo_field] || 'Bonus');
	// 还没填金额时，百分比码只能先显示比例
	if (res.promo_percent > 0)
		return {cls: 'text-success', text: '+' + res.promo_percent + '% ' + label};
	if (res.is_referral && !(res.promo_bonus > 0))
		return {cls: 'text-success', text: translate_string('Referral code is valid')};
	return {cls: 'text-success', text: '+' + formatNumber(Number(res.promo_bonus || 0)) + ' ' + label};
}

// 下面这一整套（LANG_FETCH_TIMEOUT/_localeJsLoaded/load_lang/load_script/apply_lang/
// translate_string/translate_source/translate_attr/translate_node/translate_obj）原来定义在
// core.js 的 ICAFEMENU_CORE 对象上。它们对外的唯一早绑定要求——bootstrap.js 的 loadLangPack()
// 在开机阶段直接调用 apply_lang——已经不成立了：helper.js 现在改成顶层 main.htm 静态加载，
// 跟 core.js 一样早，bootstrap.js 运行时 helper.js 已经加载完。翻译运行时本身也更像"作用于
// 全部页面内容的通用能力"，不像 core.js 里 lang_path 这类跟 window.theBootstrap 分支A/B
// 部署拓扑强绑定的东西，所以整套搬过来，只有 lang_path 本身留在 core.js（继续跟
// posters_path 等路径解析家族在一起），这里用 ICAFEMENU_CORE.lang_path(...) 引用它。

// 语言包请求超时（毫秒）。它卡在开机引导链路上（main.htm 的 loadLangPack 是 await 的），
// 服务器"连得上但不响应"时不能无限等，到点就当拿不到，让 apply_lang 去走 locale.js 兜底。
var LANG_FETCH_TIMEOUT = 5000;

// 整包 locale.js 有 3.7MB，兜底只加载一次；它是嵌套结构、含全部语言，装一次就够切了
var _localeJsLoaded = false;

/* 语言包按需加载：js/lang/<code>.json，扁平结构 {"english key":"译文"}，一种语言一个文件。
 * 原来客户端加载的是整包 js/locale.js（嵌套 {"english key":{"ru":"…"}}，3.7MB、上万个 key），
 * 现在只下当前语言那一份（150–270KB），英文零请求。
 *
 * 取不到时返回 false 且**不动** window.theLangStrings —— 这样 apply_lang 兜底加载过的
 * 整包 locale.js 不会被一次失败的按语言请求清掉，切语言仍然能从整包里查到译文。
 */
async function load_lang(code) {
	code = (code || 'en').toString().toLowerCase();

	// 英文就是 key 本身，没有语言包。注意这里**不能**把 theLangStrings 清成 {}：
	// translate_string 在 lang==='en' 时已经提前返回英文原文，根本不会查表；
	// 而清掉的话，走整包兜底的机器只要切一次英文再切回去，整包就没了，从此翻不了。
	if (code === 'en')
		return true;

	if (!/^[a-z0-9_-]+$/.test(code)) // 防路径穿越
		return false;

	// fetch 本身**没有** timeout 选项（传了会被静默忽略），超时只能靠 AbortController：
	// 起一个 setTimeout 到点 abort，请求就以 AbortError reject 出来，跟网络错误一起被
	// 下面的 catch 吃掉、返回 false。不用 AbortSignal.timeout()，那是 Chrome 103+ 才有的
	// API，客户端的 CEF 内核不保证有那么新。
	const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
	const timer = ctrl ? setTimeout(() => ctrl.abort(), LANG_FETCH_TIMEOUT) : null;

	try {
		// 计时器要等 res.json() 读完 body 才 clear —— fetch 的 Promise 在**响应头**到达时
		// 就 resolve 了，body 是之后流下来的，只掐到响应头等于没掐住慢响应。
		const res = await fetch(ICAFEMENU_CORE.lang_path('lang/' + code + '.json'), {
			cache: 'no-cache',
			signal: ctrl ? ctrl.signal : undefined,
		});
		if (!res.ok)
			return false;
		const pack = await res.json();
		if (!pack || typeof pack !== 'object')
			return false;
		window.theLangStrings = pack;
		return true;
	} catch (e) {
		return false;
	} finally {
		if (timer)
			clearTimeout(timer);
	}
}

function load_script(url) {
	return new Promise(function (resolve, reject) {
		var el = document.createElement('script');
		el.src = url;
		el.onload = resolve;
		el.onerror = reject;
		document.head.appendChild(el);
	});
}

/* 应用某种语言：拉语言包 + 重新翻译整个页面。
 * 引导时（main.htm 的 loadLangPack）和用户在设置里切语言（vueGlobal.applyLanguage）
 * 都走这一个入口，保证两条路径的兜底行为完全一致——之前切语言那条路是内联在模板 @click
 * 里的一行 translate_obj，语言包改成按语言加载后它就不灵了（切了语言却没拉对应的包）。
 */
async function apply_lang(code) {
	code = (code || 'en').toString();

	// translate_string 读的是 theSettings.license_lang，必须先于 translate_obj 设好
	if (typeof theSettings !== 'undefined' && theSettings)
		theSettings.license_lang = code;

	const ok = await load_lang(code);

	// 按语言的包拿不到：老版本 iCafeCloud Server 只给分支 A 下发了整包 locale.js、
	// 没有 lang/ 目录，退回去加载整包，别让这些机器直接掉回英文
	if (!ok && !_localeJsLoaded && code.toLowerCase() !== 'en') {
		console.warn('[lang] lang/' + code + '.json not available, falling back to locale.js');
		try {
			await load_script(ICAFEMENU_CORE.lang_path('locale.js'));
			_localeJsLoaded = true;
		} catch (e) {
			console.warn('[lang] locale.js fallback failed', e);
		}
	}

	translate_obj(document.body);
	// 通知所有 {{translate_string(...)}} 重新求值（见下面 lang_signal 的说明）
	var sig = lang_signal();
	if (sig)
		sig.v++;
	return code;
}

/* 语言切换的响应式信号。
 * translate_obj 只重翻带 .lang 的静态文字；模板里的 {{translate_string('…')}} 是 petite-vue
 * 的插值，只有它依赖的响应式数据变了才会重新求值——而 theLangStrings / theSettings.license_lang
 * 都不是响应式的，于是运行中切语言后这些插值一直停在旧语言，要等别的数据碰巧变了才刷新
 * （典型：purple 排序下拉，触发按钮因为排序值变过显示了俄语，展开的选项还是英文）。
 * 做法：translate_string 每次读一下 v 建立依赖，apply_lang 装完新语言包后 v++，
 * 所有插值随之重算。CP 那边 translate.js 的 theLangState 是同一个思路。
 * PetiteVue 由主题的 main.htm 加载，比 helper.js 晚，所以懒创建：
 * 引导阶段第一次 apply_lang 时还没有 PetiteVue，那时模板也还没挂载，不需要通知。 */
var _langSignal = null;
function lang_signal() {
	if (!_langSignal && typeof PetiteVue !== 'undefined' && PetiteVue.reactive)
		_langSignal = PetiteVue.reactive({ v: 0 });
	return _langSignal;
}

function translate_string(eng) {
	// 先读信号再做任何提前返回：英文模式下插值也要登记依赖，否则从英文切到别的语言时不会刷新
	var sig = lang_signal();
	if (sig)
		sig.v;

	if (!eng) // 原来直接 .toString()，传 null/undefined 会抛 TypeError
		return '';

	eng = eng.toString();

	if (eng.length == 0)
		return '';

	if (typeof theLangStrings === 'undefined' || !theLangStrings)
		return eng;

	var lang = (typeof theSettings !== 'undefined' && theSettings.license_lang) ? theSettings.license_lang.toLowerCase() : 'en';
	if (lang === 'en')
		return eng;

	var val = theLangStrings[eng.toLowerCase()];
	if (val == null)
		return eng;

	// 新：js/lang/<code>.json 的单语言扁平包；旧：js/locale.js 的多语言嵌套包
	// 两种结构都要认——分支 A 的本地兜底还可能是整包
	return (typeof val === 'string') ? val : (val[lang] ?? eng);
}

/* 记账守卫：决定这次拿什么当英文原文（与 html/js/translate.js 的 translate_source 同逻辑）
 * 当前内容与 outProp 记的译文一致 ⇒ 这段文字还是上次我们写进去的，用缓存的英文原文；
 * 对不上 ⇒ 说明被 vue 重新渲染过，必须拿当前内容重新当原文，
 * 否则会把上一次的译文当英文 key 永久钉死（ui_init 会反复全量重扫 body）。
 */
function translate_source(obj, cur, keyProp, outProp) {
	var eng = (obj.dataset[outProp] === cur) ? obj.dataset[keyProp] : cur;
	return (eng == null || eng === '') ? cur : eng; // 记账残缺时退回当前内容，别写出 undefined
}

// 翻译单个属性（title / placeholder / 按钮 value）
function translate_attr(obj, attr, keyProp, outProp) {
	var cur = obj.getAttribute(attr);
	if (cur == null)
		return;

	cur = cur.trim();
	if (cur.length == 0)
		return;

	var eng = translate_source(obj, cur, keyProp, outProp);
	var trans = translate_string(eng);
	var out = (trans?.length > 0) ? trans : eng;
	if (out === cur) // 内容没变就别动 DOM，也不用记账
		return;

	obj.setAttribute(attr, out);
	obj.dataset[keyProp] = eng;
	obj.dataset[outProp] = out;
}

// 翻译单个 .lang 元素（正文 + title + placeholder + 按钮 value）
function translate_node(obj) {
	if (obj.children.length == 0) {
		// 取 key 用 textContent 而不是 innerHTML：innerHTML 会把 & < > 重新转义成实体，
		// "Drag & drop file or browse" 读出来是 "Drag &amp; drop file or browse"，而
		// table_lang 里存的 key 是未转义形式（词条一律按 textContent 提取）
		var cur = (obj.textContent || '').trim();
		if (cur.length > 0) {
			var eng = translate_source(obj, cur, 'langKey', 'langOut');
			var trans = translate_string(eng);
			var out = (trans?.length > 0) ? trans : eng;
			if (out !== cur) {
				obj.textContent = out; // 避免vue render 的时候与vue变量冲突
				obj.dataset.langKey = eng;
				// 回读一次而不是直接存 out，保证记账值与下次算 cur 的方式完全一致
				obj.dataset.langOut = (obj.textContent || '').trim();
			}
		}
	}

	translate_attr(obj, 'title', 'langKeyTitle', 'langOutTitle');
	// Bootstrap 3 的 tooltip 初始化时会把 title 挪进 data-original-title 并把 title 清空，
	// 之后每次悬停都读 data-original-title（core/lib/bootstrap.js 的 fixTitle / getTitle）。
	// tooltip 先于翻译初始化时 title 已经是空的、上面那行翻不到，悬停显示的就一直是英文；
	// 切语言时也一样只改得到 title、改不到 tooltip 实际显示的那份。所以这份也要翻。
	translate_attr(obj, 'data-original-title', 'langKeyOtitle', 'langOutOtitle');
	translate_attr(obj, 'placeholder', 'langKeyPlaceholder', 'langOutPlaceholder');

	// tagName 必须限定 INPUT：<button> 的 obj.type 默认就是 'submit'，
	// 不加这层判断会把空的 button.value 也拿去翻译并写回
	if (obj.tagName == 'INPUT' && (obj.type == 'button' || obj.type == 'submit'))
		translate_attr(obj, 'value', 'langKeyValue', 'langOutValue');
}

// translate all childs with lang class for DOM => translate_obj($('body')),  translate_obj($('#member-table'))
function translate_obj(element) {
	if (element == null || typeof (element) !== 'object'){
		return '';
	}
	if( element.forEach ){
		return element.forEach(el=>translate_obj(el))
	}
	// 兼容jq
	if( element.each ){
		return element.each((i,el)=>translate_obj(el))
	}
	if( typeof element.querySelectorAll !== 'function' ){
		return '';
	}
	// 根元素自身带 .lang 时也要翻译：querySelectorAll 只找后代，
	// JS 动态创建单个 .lang 元素后直接传进来的场景（如 shop.js 的 QR 提示）以前是空操作
	if (typeof element.matches === 'function' && element.matches('.lang'))
		translate_node(element);

	element.querySelectorAll('.lang').forEach(obj => translate_node(obj));
}

function is_member_birthday_today()
{
	if (!is_member_logined() || !thePCStatus.member_birthday || thePCStatus.member_birthday == '0000-00-00') {
		return false;
	}
	
	var cols = thePCStatus.member_birthday.split('-');
	if (cols.length !== 3) {
		return false;
	}
	
	var today = new Date();
	var month = (today.getMonth() + 1).toString().padStart(2, '0');
	var day = today.getDate().toString().padStart(2, '0');
	
	return cols[1] == month && cols[2] == day;
}

// 检查输入是否为英文键盘布局
function isEnglishKeyboardInput(event) {
	const key = event.key;
	if (!key || key.length !== 1) {
		return true;
	}
	const codePoint = key.codePointAt(0);
	// 英文字母 A-Z, a-z
	if ((codePoint >= 0x0041 && codePoint <= 0x005A) ||
		(codePoint >= 0x0061 && codePoint <= 0x007A)) {
		return true;
	}
	// 数字和常见符号
	if ((codePoint >= 0x0030 && codePoint <= 0x0039) ||
		(codePoint >= 0x0020 && codePoint <= 0x002F) ||
		(codePoint >= 0x003A && codePoint <= 0x0040) ||
		(codePoint >= 0x005B && codePoint <= 0x0060) ||
		(codePoint >= 0x007B && codePoint <= 0x007E)) {
		return true;
	}
	return false;
}
function isPromotedOfferInUsing(offers){
	if( (theSettings.client_show_electric_border || 0) == 0)
		return false;

	if(!(offers.length >= 2 && offers[1] && offers[1].time_type == 'offer')) // offer session 没有balance
		return false;

	if (!offers[1].in_using) {
		return false;
	}

	return offers[1].product_is_promoted == 1;
}

// 网关支付展示模型：把 getTopupUrl / payOrder 的返回值归一成「一段二维码文本 + 一段 HTML」。
// 各网关返回的形态不同——多数给一串可编码成二维码的 url，razorpay/paymongo/midtrans/finik/manual
// 直接给一张图片地址，kaspi 给 url 的同时还要额外显示自家 logo——过去这套 if 分支在
// login.js（3 处）、shop.js（topup 和 showPayOrder）里各抄了一份，改一个网关要改 5 个地方。
// CP / member portal 侧有一份同名同结构的实现（api/html/js/functions.js），两个运行时无法共用文件，
// 但保持形态一致，改网关展示时两边一起改。
// @param {object} data 网关返回值：{type, url, payment_url, amount, ...}
// @param {object} [options] currency: manual 网关的金额前缀，kiosk 会带，其余入口留空
// @returns {{qr_text: string, html: string, show_kaspi_logo: boolean}}
function build_payment_view(data, options = {}) {
	const view = { qr_text: data.url ?? '', html: '', show_kaspi_logo: false };
	const image_url = data.payment_url ?? '';

	switch (data.type) {
		case 'kaspi':
			// 二维码照常显示，只是额外挂一张 kaspi logo（图片由各主题模板给出）
			view.show_kaspi_logo = true;
			break;
		case 'razorpay':
			// razorpay 的 url 本身就是二维码图片地址，不能再编码一次
			view.qr_text = '';
			view.html = `<div class="razorpay-qr-img"><img src="${data.url}" alt="razorpay payment qr code"/></div>`;
			break;
		case 'manual':
			view.qr_text = '';
			view.html = `<div>
					<ol class="text-left">
						<li>${translate_string('Scan and pay ')}<font color="red" size="3rem">${options.currency ? options.currency + ' ' : ''}${(data.amount ?? 0).toFixed(2)}</font></li>
						<li>${translate_string('Contact the staff and confirm your payment.')}</li>
					</ol>
					<img src="${image_url}"/>
				</div>`;
			break;
		case 'paymongo':
			view.qr_text = '';
			view.html = `<div><img src="${image_url}" alt="QR Code" style="width:266px" /></div>`;
			break;
		case 'midtrans':
			view.qr_text = '';
			view.html = `<div><img src="${image_url}" alt="midtrans QR Code" style="width:266px" /></div>`;
			break;
		case 'finik':
			view.qr_text = '';
			view.html = `<div><img src="${image_url}" alt="Finik QR Code" style="width:266px; background-color: white;" /></div>`;
			break;
	}
	return view;
}

// 把支付展示模型写进 topup 弹窗的 vue 对象（vueTopup / vueTopupLogin 共用同一组字段），
// 并在 qr_selector 指定的容器里画出二维码。qris 需要轮询订单状态，一并在这里挂上。
// @param {object} vueTopupObj 目标 vue 对象
// @param {object} data 网关返回值
// @param {string} qr_selector 二维码容器选择器
function apply_topup_payment_view(vueTopupObj, data, qr_selector) {
	const view = build_payment_view(data);

	vueTopupObj.payment_qr = view.qr_text;
	vueTopupObj.payment_html = view.html;
	vueTopupObj.payment_type_img = view.show_kaspi_logo;
	vueTopupObj.topup_order_no = data.order_no ?? '';

	if (view.qr_text) {
		PetiteVue.nextTick(() => {
			const qrEl = document.querySelector(qr_selector);
			if (qrEl) {
				qrEl.innerHTML = '';
				new QRCode(qrEl, view.qr_text);
			}
		});
	}

	if (data.type == 'qris') {
		poll_topup_status(data);
	}
}

// 轮询订单状态。两个用途：
//   1. qris 不推 WSS 回调，只能靠轮询（原用途，调用方不传 options，行为不变）
//   2. 自助注册买新会员套餐：付款到账才能把注册表单放出来。WSS 有丢帧的可能，而这条路上
//      丢一帧就是顾客付了钱、界面却永远停在二维码，所以轮询是和 WSS 并联的双保险，不是兜底。
//
// @param {object} data 网关返回值，需含 order_no / t / sid
// @param {object} [options] onPaid(order) / onCancelled(order) / onGiveUp() / intervalMs / maxMs
// @returns {function} 取消函数
function poll_topup_status(data, options) {
	const opt = options || {};
	const onPaid = opt.onPaid || function () {};
	const onCancelled = opt.onCancelled || function () {};
	const onGiveUp = opt.onGiveUp || function () {};
	const intervalMs = opt.intervalMs || 10_000;
	const maxMs = opt.maxMs || 100_000;

	let timer = null;
	let stopped = false;
	const stop = () => { stopped = true; if (timer) { clearTimeout(timer); timer = null; } };

	if (!data.order_no || !data.t || !data.sid) {
		return stop;
	}

	const started = Date.now();
	const check = async () => {
		if (stopped) return;
		if (Date.now() - started > maxMs) { onGiveUp(); return; }

		let order = null;
		try {
			order = await theApiClient.callCafeApi('getTopupStatus', 'GET', { order_no: data.order_no, t: data.t, sid: data.sid });
		} catch (e) {
			// 窗口过期/网络抖动：停止轮询，但绝不谎称成功
			onGiveUp();
			return;
		}
		if (stopped) return;

		// result 未定义说明是 {code:400/404} 之类的失败响应，不能当成已付款。
		// 判定要用精确的 == DONE 而不是 "!= IN_PROCESS"：店员在 CP 把这张待付单取消掉时
		// 状态会变成 CANCEL，那同样不是 IN_PROCESS，却绝不是付款成功。
		if (typeof order?.result !== 'undefined') {
			if (order.order_status == ORDER_STATUS_DONE) { onPaid(order); return; }
			if (order.order_status == ORDER_STATUS_CANCEL) { onCancelled(order); return; }
		}
		timer = setTimeout(check, intervalMs);
	};
	timer = setTimeout(check, intervalMs);
	return stop;
}

// 生成一个可直接插进弹窗的支付展示节点：二维码或图片，外加一行网关名。
// 供 showPayOrder（订单二次支付）使用；member portal 侧有一份同样的实现。
// @param {object} data 网关返回值
// @returns {HTMLElement}
function build_payment_qr_element(data) {
	const view = build_payment_view(data);
	const el = document.createElement('div');

	if (view.html) {
		el.innerHTML = view.html;
	} else if (view.qr_text) {
		new QRCode(el, view.qr_text);
	}

	// kaspi 要在二维码下方额外挂一张自家 logo。这里原来漏了（只有 apply_topup_payment_view
	// 那条路径处理），导致走本函数的入口（shop.js 的 showPayOrder、自助注册买套餐）对 kaspi
	// 网吧少一张图。相对路径按文档级 <base href="themes/{theme}/"> 解析，各主题各有一份。
	if (view.show_kaspi_logo) {
		const logo = document.createElement('img');
		logo.src = 'images/kaspi_qr.jpg';
		logo.className = 'topup-payment-type-img';
		el.appendChild(logo);
	}

	const gatewayEl = document.createElement('div');
	gatewayEl.innerHTML = `<span class='text-uppercase'>--${data.type}--</span>`;
	el.appendChild(gatewayEl);
	return el;
}
