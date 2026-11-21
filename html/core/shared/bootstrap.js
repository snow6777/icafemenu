// 客户端顶层开机引导逻辑，从 main.htm 里搬出来（原来直接内联在 <head> 的 <script> 里，main.htm
// 本身膨胀到 300 多行 JS）。main.htm 只保留：最早必须原地执行的版本标记 + 全局错误处理
// （必须在 jquery.js/core.js 开始下载之前就注册好，才能捕获它们加载失败的错误）、静态的
// <script src>/<link preload> 标签，以及这个文件的加载。
//
// 依赖 main.htm 顶层设置好的 window.__ASSET_VERSION_QS__（见 main.htm 顶部注释）——这个文件
// 是 .js，不会被 build-assets.sh 处理，不能自己硬编码 '?__version__' 字面量。

// Set a fixed station name here, e.g. 'PC-01'. Leave empty to use the name supplied by iCafeMenu.exe.
// window.__PC_NAME_OVERRIDE__ = 'B-22'
// window.__PC_NAME_OVERRIDE__ = ((n) => n ? n.slice(0, -1) + '​' + n.slice(-1) : '')('B-22' || '');

//window.__PC_NAME_OVERRIDE__ = ((n) => n ? n.slice(0, -1) + '​' + n.slice(-1) : '')(new URLSearchParams(location.search).get('pc_name') || '');
window.__PC_NAME_OVERRIDE__ = ((n) => n ? n.slice(0, -1) + '' + n.slice(-1) : '')(new URLSearchParams(location.search).get('pc_name') || '');

function showBootMessage(text) {
	document.body.innerHTML = '<div style="color:#999;text-align:center;margin-top:40vh;font-family:sans-serif;font-size:16px">' + text + '</div>';
}

function loadScript(url) {
	return new Promise(function (resolve, reject) {
		var el = document.createElement('script');
		el.src = url;
		el.onload = function () {
			resolve();
		};
		el.onerror = function (e) {
			console.error('[bootstrap] loadScript FAILED:', url, e);
			reject(e);
		};
		document.head.appendChild(el);
	});
}

/* 语言包：js/lang/<code>.json 按语言切分，只下当前语言那一份（150–270KB），
 * 原来是整包 js/locale.js —— 3.7MB、上万个 key，不管网吧用哪种语言都全量下载 + 解析。
 *
 * 唯一的代价是它跟 icafe.js 有了先后关系：语言码取自 theSettings.license_lang，
 * 而 theSettings 是 icafe.js 定义的，所以只能等 icafe.js 执行完再发，不能像整包那样
 * 在最前面并行预抓。换来的是少下几 MB，慢链路上净赚。
 *
 * 加载 + 兜底 + 重新翻译都在 core/js/helper.js 的 apply_lang 里，跟用户在设置里切语言
 * （vueGlobal.applyLanguage）共用同一个入口，避免两条路径的兜底行为跑偏；apply_lang 现在
 * 跟 core.js 一样早（helper.js 改成顶层 main.htm 静态加载），这里能直接裸调用它。
 * 路径由 ICAFEMENU_CORE.lang_path 按分支 A/B 自己算，这里不用再传。
 */
async function loadLangPack() {
	const code = await apply_lang((typeof theSettings !== 'undefined' && theSettings.license_lang) || 'en');
	console.log('[bootstrap] lang applied: ' + code);
}

// 主题片段（themes/{theme}/main.htm）里的相对路径（../../core/js/xxx.js、css/style.css 等）都是
// 按"自己就是 themes/{theme}/ 目录下的独立文档"来写的，需要一个 <base href="themes/{theme}/"> 才能正确解析。
// 但这段 HTML 是通过 fetch() + $().html() 当字符串注入到 main.htm 所在文档里的，片段字符串里自带的
// <base> 标签不会生效（HTML 规范：只有文档 <head> 里解析阶段就存在的第一个 <base> 才会生效，动态插入
// 到 <body> 内容里的不算）——导致所有这些相对路径实际按 main.htm 自己的目录解析，全部多跳出一层、
// 404，连 core/core.js 都加载不到（表现为 "OnCommand is not defined" 之类的报错）。
// 修复：不改主题片段里任何路径写法，而是让 main.htm 自己的文档提前拥有一个真正生效的 <base> 标签。
function setDocumentBase(theme) {
	let baseEl = document.querySelector('base');
	if (!baseEl) {
		baseEl = document.createElement('base');
		document.head.insertBefore(baseEl, document.head.firstChild);
	}
	baseEl.setAttribute('href', `themes/${theme}/`);
}

// 主题片段（themes/{theme}/main.htm）开头有 12 个 lib + 10 个 core/js（helper.js 现在改成
// 顶层 main.htm 静态加载，不在这批里）+ 1 个共享的 theme-bootstrap.js 共 23 个 <script src>
// 标签，之前整段文本直接交给 jQuery 的 .html() 注入——jQuery 为了保证执行顺序，对字符串里的
// 外链 <script> 是逐个"下载完再发起下一个"的（不像浏览器原生解析 <script> 标签那样可以并行
// 下载），二十几次串行网络往返是登录页迟迟不出现的主要原因之一。
// 这里改成：先把这段"纯 src、无内联内容"的 script 标签摘出来，用 async=false 的动态 script 元素
// 并行下载、但仍按原顺序串行执行（HTML 规范保证的行为），装完后再把剩下的 HTML（容器 div + 主题
// 自己的内联启动脚本，调用 theme-bootstrap.js 里的 loadThemeBootstrap()）原样交给 jQuery 处理，
// 不改变它们和页面初始化之间的时序关系。两个主题各自的 js/app.js 现在都是通过 loadThemeBootstrap()
// 的 extraScripts 参数、在 initApp() 完成之后才加载，不再有主题各自处理这个时序的差异。
function loadScriptsInOrderParallel(urls) {
	console.log('[bootstrap] loadScriptsInOrderParallel start, ' + urls.length + ' scripts:', urls);
	return new Promise((resolve, reject) => {
		if (urls.length === 0) { resolve(); return; }
		let remaining = urls.length;
		let failed = false;
		urls.forEach(url => {
			const el = document.createElement('script');
			el.src = url;
			el.async = false;
			el.onload = () => {
				if (failed) return;
				remaining--;
				console.log('[bootstrap] theme script loaded: ' + url + ' (' + remaining + ' remaining)');
				if (remaining === 0) resolve();
			};
			el.onerror = (e) => {
				if (failed) return;
				failed = true;
				console.error('[bootstrap] theme script failed to load:', url, e);
				reject(e);
			};
			document.head.appendChild(el);
		});
	});
}

function injectThemeHtml(text) {
	// 只摘取"文件开头到第一个内联 <script> 块之前"这一段里的纯 <script src> 标签——两个主题的这个
	// 内联块都是不带任何属性的字面量 <script>（启动 loadThemeBootstrap()/initApp() 的那段），用它做分界点，
	// 分界点之后的内容（包括 icafemenu 主题排在它后面的 app.js）保持原样不动
	const splitIdx = text.indexOf('<script>');
	const head = splitIdx === -1 ? text : text.slice(0, splitIdx);
	const tail = splitIdx === -1 ? '' : text.slice(splitIdx);

	const scriptTagRe = /<script\s+src="([^"]+)"\s*><\/script>\s*/g;
	const urls = [];
	let match;
	while ((match = scriptTagRe.exec(head)) !== null) {
		urls.push(match[1]);
	}
	const headRemainder = head.replace(scriptTagRe, '');

	return loadScriptsInOrderParallel(urls).then(() => {
		console.log('[bootstrap] injectThemeHtml: all theme scripts loaded, injecting HTML...');
		$('#main_body').html(headRemainder + tail);
		console.log('[bootstrap] injectThemeHtml done');
	});
}

// themePrefetch 是可选的 {blue|icafemenu|purple|gold: Promise<string>}——分支 B 在等
// gamecenter.php/icafe_js 期间就已经把这几个主题的 main.htm 并行抓好了（client_theme 的取值域
// 是 blue/icafemenu/purple/gold/custom，custom 走的是本地文件的分支 A，不会进这里），省掉"等
// theSettings.client_theme 出来才知道要哪个、再单独发一次请求"这一次串行往返；分支 A 或
// themePrefetch 里没有命中/请求失败时，退回原来的现拿现读
async function loadTheme(themePrefetch) {
	const theme = theSettings.client_theme || 'blue';
	var loadedTheme = theme;
	var text;
	console.log('[bootstrap] loadTheme start, theme=' + theme + ', hasPrefetch=' + !!(themePrefetch && themePrefetch[theme]));
	try {
		text = (themePrefetch && themePrefetch[theme])
			? await themePrefetch[theme]
			: await $.ajax({ url: `themes/${theme}/main.htm`, method: 'GET', dataType: 'text', cache: false });
		console.log('[bootstrap] loadTheme got ' + theme + ' theme content');
	} catch (e) {
		console.log(`Failed to load ${theme}, falling back to the icafemenu theme.`)
		loadedTheme = 'icafemenu';
		text = await $.ajax({ url: 'themes/icafemenu/main.htm', method: 'GET', dataType: 'text', cache: false });
		console.log('[bootstrap] loadTheme got fallback icafemenu theme content');
	}
	setDocumentBase(loadedTheme);
	console.log('[bootstrap] loadTheme calling injectThemeHtml()...');
	await injectThemeHtml(text);
	console.log('[bootstrap] loadTheme done');
};

async function bootstrap() {
	const params = new URLSearchParams(location.search);
	const icafe_id = params.get('icafe_id') || '';

	// pc_name/mac/ip/moff（关屏倒计时秒数）/ver（版本号）都是原生进程启动时（或编译期）就确定的
	// 静态值，分支 A/B 都由 icafemenu.exe 通过 URL query 一次性带给页面（见 icafemenu 仓库
	// DataDefine.cpp::LoadCafeJs() 里 g_strLoginUrl 的拼接），不再依赖原生事后调用
	// OnCommand("PCInfo", ...) 推送——那次推送只推一次不重试，时机跟原生自身初始化节奏赛跑，
	// 可能早于页面自己的脚本加载完成，分支 A 曾经因此偶发 pc_name 显示为空。key 用缩写是因为
	// pc_turn_off_monitor_seconds/version_date 太长，跟 icafe_id/pc_name/mac/ip/ts 这些既有的
	// 短 key 风格不一致；JS 变量名保留完整语义，只有 URL 上的 key 缩短。
	const pc_name = window.__PC_NAME_OVERRIDE__ || params.get('pc_name') || '';
	const mac = params.get('mac') || '';
	const ip = params.get('ip') || '';
	const pc_turn_off_monitor_seconds = parseInt(params.get('moff') || '0', 10) || 0;
	const version_date = params.get('ver') || '';

	// 分支 A（client_theme=='custom' 或 use_remote_ui=0 的网吧）：icafemenu.exe 用
	// file:///<workdir>/html/main.htm?pc_name=...&mac=...&ip=...&moff=...&ver=... 打开这份
	// 同一套代码（不带 icafe_id，main.htm 靠这个字段的有无区分分支 A/B），js/icafe.js、
	// js/lang/<code>.json 就是本地磁盘文件，跟改造前一样加载，不走下面的远程自举流程
	if (!icafe_id) {
		console.log('[bootstrap] path A start');
		try {
			console.log('[bootstrap] path A loading js/icafe.js...');
			await loadScript('js/icafe.js');
			console.log('[bootstrap] path A js/icafe.js loaded, loading apiclient.js...');
			// jquery.js / core.js 已经在上面用静态 <script> 标签加载，这里不用再等
			await loadScript('core/apiclient.js' + window.__ASSET_VERSION_QS__);
			console.log('[bootstrap] path A apiclient.js loaded, loading lang pack...');
			// 语言包依赖 icafe.js 定义的 theSettings.license_lang，只能等到这里再发；
			// 分支 A 全是本地磁盘文件，这一次多出来的等待可以忽略
			await loadLangPack();
		} catch (e) {
			console.error('Failed to load local bootstrap scripts', e);
			return;
		}
		// theApiClient 是 apiclient.js 里顶层 const 声明的绑定，不是 window 的属性，不能写
		// window.theApiClient——那样判断永远是 false，赋值代码根本不会执行
		if (typeof theApiClient !== 'undefined') {
			theApiClient.pcInfo.pc_name = pc_name;
			theApiClient.pcInfo.pc_turn_off_monitor_seconds = pc_turn_off_monitor_seconds;
			theApiClient.pcInfo.version_date = version_date;
		}
		console.log('[bootstrap] path A calling loadTheme()...');
		loadTheme();
		return;
	}

	// 分支 B：远程托管，icafemenu.exe 直接导航到 https://{server_code}.icafecloud.com/client/main.htm
	console.log('[bootstrap] path B start');

	// 两个主题的 main.htm 都不依赖 t/sid/theSettings，跟 gamecenter.php 完全没有先后关系，
	// 这里立刻并行起个头（不 await），省下的这几次串行往返最后统一在下面用到的地方再等。
	// client_theme 的取值域是 blue/icafemenu/purple/gold/custom，custom 走的是分支 A（本地文件），
	// 不会用到这里预抓的内容，几个都抓、白吃一两次小文件的浪费，换一整段网络往返。
	// main.htm 只有 4KB 上下，多抓一个的代价远小于省掉的那次串行往返。
	// 语言包原来也在这里一起预抓（整包 locale.js），改成按语言切分后它要读 icafe.js 里的
	// theSettings.license_lang，只能挪到下面 icafe.js 之后，见 loadLangPack()
	const themePrefetch = {
		blue: $.ajax({ url: 'themes/blue/main.htm', method: 'GET', dataType: 'text', cache: false }),
		icafemenu: $.ajax({ url: 'themes/icafemenu/main.htm', method: 'GET', dataType: 'text', cache: false }),
		purple: $.ajax({ url: 'themes/purple/main.htm', method: 'GET', dataType: 'text', cache: false }),
		gold: $.ajax({ url: 'themes/gold/main.htm', method: 'GET', dataType: 'text', cache: false }),
	};
	// 只有 theSettings.client_theme 实际指向的那一个会被 loadTheme() await，另一个如果请求失败
	// 也不该在控制台冒出 unhandled rejection——这里单独挂一个空的失败回调让它"被处理过"，loadTheme()
	// 里真正 await 的还是 themePrefetch[theme] 这个原始 jqXHR，失败时该抛还是抛。
	// jQuery 2.1.1 的 Deferred/jqXHR 没有 .catch()（那是 jQuery 3.0 才加的别名），用两参数的
	// .then(null, fn) 达到同样效果
	themePrefetch.blue.then(null, () => {});
	themePrefetch.icafemenu.then(null, () => {});
	themePrefetch.purple.then(null, () => {});
	themePrefetch.gold.then(null, () => {});

	// 1. 拿 license_server_code + 服务端签发的 t/sid（gamecenter.php 的 action=servercode 分支不需要 Basic Auth）
	// 改用 jQuery $.ajax，跟客户端其它接口调用方式保持一致；开机时的联网等待已经交给原生
	// CDataSystemParams::WaitForCpConnectivity() 在浏览器窗口创建之前处理，这里不用再自己加超时
	console.log('[bootstrap] path B requesting gamecenter.php...');
	let boot;
	try {
		boot = await $.ajax({
			url: `/api/gamecenter.php?action=servercode&icafe_id=${encodeURIComponent(icafe_id)}&format=json`,
			method: 'GET',
			dataType: 'json',
			cache: false
		});
		console.log('[bootstrap] path B gamecenter.php responded');
	} catch (e) {
		console.error('Failed to reach gamecenter.php', e);
		showBootMessage(translate_string('Network error, retrying...'));
		setTimeout(() => location.reload(), 5000);
		return;
	}

	if (!boot || !boot.license_server_code || !boot.t || !boot.sid) {
		// 用 warn 不用 error：这不一定是真正的 bug，服务端在该网吧 use_remote_ui=0 时会故意不签发
		// t/sid（安全边界，见 gamecenter.php 的注释），本地缓存的 icafe.js 只要跟服务端配置有一时的
		// 不一致（比如 use_remote_ui 刚被人手工改过库、缓存还没刷新）就会走到这里——error 会被
		// wkeConsoleMesssage 转成原生弹窗打断使用，warn 不会，但日志里的 source/line/level 细节不受影响
		console.warn('[bootstrap] gamecenter.php returned invalid data:', boot);
		showBootMessage(translate_string('Invalid license.'));
		return;
	}

	// 2. 分片不对就整页跳转过去（正常情况下不会触发，因为 icafemenu 本地预置的 server_code 通常就是对的；
	// 只有网吧被迁移到别的分片之后、本地缓存还没更新时才会走到这里）。localhost 是本地开发场景，不跳转。
	const currentCode = location.hostname.split('.')[0].toLowerCase();
	if (location.hostname !== 'localhost' && currentCode !== boot.license_server_code.toLowerCase()) {
		console.log('[bootstrap] shard mismatch (current=' + currentCode + ', expected=' + boot.license_server_code + '), redirecting');
		// ts 用当前时间戳保证跳转后的 URL 每次都不同，main.htm 是静态文件、响应头没有 Cache-Control，
		// 不带这个会被 CEF/浏览器磁盘缓存吃到旧版本
		const query = new URLSearchParams({icafe_id, pc_name, mac, ip, moff: pc_turn_off_monitor_seconds, ver: version_date, ts: Date.now()}).toString();
		window.location.href = `https://${boot.license_server_code}.icafecloud.com/client/main.htm?${query}`;
		return;
	}

	// 3. 保存引导数据（wss-client.js 的登录包要 icafe_id/pc_name/mac/ip/t/sid）。
	// 它同时是 core.js 里 posters_path / lang_path 区分分支 A/B 的依据（分支 A 是本地
	// file://，没有这个对象），所以必须早于任何用到这两个路径函数的代码——语言包就在
	// 下面一步加载，之前放在 icafe.js 之后赋值，会让 lang_path 误判成分支 A、去拉
	// /client/js/lang/xx.json（那个目录在服务器上不存在）。
	window.theBootstrap = {icafe_id, pc_name, mac, ip, t: boot.t, sid: boot.sid, license_server_code: boot.license_server_code};

	// 4. icafe.js（clientapi.php 动态生成）依赖上一步拿到的 t/sid，必须等到这里才能发；
	// apiclient.js 顶层代码要读 icafe.js 定义的 theSettings/theCafe，执行顺序不能变，但它的字节
	// 已经在 <head> 里用 <link rel=preload> 提前抓了，这里基本是命中缓存直接执行，不用再等一次
	// 网络往返。
	// jQuery / core.js 已经在上面用静态 <script> 标签加载，这里不用再等
	try {
		console.log('[bootstrap] path B loading icafe_js via clientapi.php...');
		await loadScript(`/api/clientapi.php?type=icafe_js&icafe_id=${encodeURIComponent(icafe_id)}&pc_name=${encodeURIComponent(pc_name)}&t=${encodeURIComponent(boot.t)}&sid=${encodeURIComponent(boot.sid)}&icafe_js_update_time=0`);
		console.log('[bootstrap] path B icafe_js loaded, loading apiclient.js...');
		await loadScript('core/apiclient.js' + window.__ASSET_VERSION_QS__);
		console.log('[bootstrap] path B apiclient.js loaded, loading lang pack...');
		// 语言包读 icafe.js 里的 theSettings.license_lang，只能排在 icafe.js 之后
		await loadLangPack();
	} catch (e) {
		console.error('Failed to load bootstrap scripts', e);
		showBootMessage(translate_string('Failed to load. Retrying...'));
		setTimeout(() => location.reload(), 5000);
		return;
	}

	// theApiClient 是 apiclient.js 里顶层 const 声明的绑定，不是 window 的属性，不能写
	// window.theApiClient——那样判断永远是 false，赋值代码根本不会执行
	if (typeof theApiClient !== 'undefined') {
		theApiClient.pcInfo.pc_name = pc_name;
		theApiClient.pcInfo.pc_turn_off_monitor_seconds = pc_turn_off_monitor_seconds;
		theApiClient.pcInfo.version_date = version_date;
	}

	// 5. 继续原有的主题加载流程，把前面并行抓好的两个主题内容一起带过去
	console.log('[bootstrap] path B calling loadTheme()...');
	loadTheme(themePrefetch);
}

bootstrap();
