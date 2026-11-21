// 两个主题的 main.htm 之前各自手写了一段几乎一模一样的开机加载链（并行拉取页面片段、注入
// DOM、调用 initApp()、加载主题额外脚本、隐藏开机 loading、跑一遍翻译），只有"具体拉哪些页面/
// 侧边栏文件名/额外脚本"这几项数据不一样。这里把逻辑部分抽成共享函数，数据部分留在各主题
// 自己的 main.htm 里，用一小段内联脚本传参调用，新增主题只需要照抄这段调用+改自己的数据，
// 不用重新写一遍整条加载链。
//
// config 参数：
//   pages        必填，数组，每项 { url, id }：url 相对当前主题目录（或 ../../core/shared/
//                这样的相对路径），id 是要注入到的容器元素 id。
//   sidebar      可选，字符串，member-sidebar 片段的文件名；不传就跳过侧边栏加载。
//   extraScripts 可选，字符串数组，加载完 initApp() 之后再依次加载的主题专属脚本（两个主题目前
//                都是 js/app.js），会自动带上 ?__version__ 缓存戳；不传或空数组就跳过这一步。
async function loadThemeBootstrap(config) {
	const pages = config.pages || [];

	console.log('[bootstrap] loadPages start, ' + pages.length + ' pages');
	// 页面片段加载期间的遮挡完全靠客户端顶层 main.htm 的 #boot_loading 全屏黑屏动画，这里不用
	// 再额外隐藏/显示 #main_body 一次——那是 #boot_loading 出现之前的老机制，#boot_loading 已经
	// 把黑屏覆盖的范围延伸到了更早的阶段（拿t/sid、生成icafe.js等），完全盖住了这里的整个过程。
	async function loadPage(page) {
		const text = await $.ajax({ url: page.url, method: 'GET', dataType: 'text', cache: false });
		$('#' + page.id).html(text);
		console.log('[bootstrap] page loaded: ' + page.id);
	}

	// layout.htm 里嵌了 #page-home/#page-game/#page-shop/#page-event/#page-rank 这几个容器 div
	// （主题自己的内容，这里不关心具体是哪几个），main.htm 顶层只有一个空的 #page-layout 占位——
	// 这几个真正的注入目标要等 layout.htm 自己的内容注入完才会出现在 DOM 里。如果其它页面片段
	// （通常体积比 layout.htm 小得多）网络上先回来，对着还不存在的容器调 $('#id').html(text)，
	// jQuery 在空选择器上静默不做任何事——不报错、不 reject，内容直接丢失，且没有任何breadcrumb
	// （下面这行 console.log 不管注入是否真的命中都会打印），游戏列表/商品列表就会无声消失。
	// 修复：让 layout.htm 单独 await 完成，确保它的容器 div 先落地，再并发其余页面；对没有
	// page-layout 这一项的主题（理论上的自定义结构）不受影响，走回原来的全部并行。
	const layoutPage = pages.find(p => p.id === 'page-layout');
	const otherPages = layoutPage ? pages.filter(p => p.id !== 'page-layout') : pages;
	if (layoutPage) {
		await loadPage(layoutPage);
	}

	// sidebar 的抓取跟其余页面一起并行；它的 DOM 注入仍然放在最后，保留"所有页面片段都注入完
	// 之后再注入 sidebar"这个原有的时序保证（sidebar 容器同样可能嵌在 game.htm/shop.htm 等
	// 页面片段里）
	const fetches = [
		Promise.all(otherPages.map(loadPage)),
	];
	if (config.sidebar) {
		fetches.push($.ajax({ url: config.sidebar, method: 'GET', dataType: 'text', cache: false }));
	}
	const [, sidebarText] = await Promise.all(fetches);
	if (config.sidebar) {
		$('.member-sidebar').html(sidebarText);
	}
	console.log('[bootstrap] loadPages done');

	console.log('[bootstrap] calling initApp()...');
	await initApp();

	for (const src of (config.extraScripts || [])) {
		console.log('[bootstrap] loading extra script: ' + src);
		await new Promise((resolve, reject) => {
			const script = document.createElement('script');
			// 不能硬编码字面量 '?__version__'——这行代码在 .js 文件里，build-assets.sh 只处理
			// .htm 文件，这个字面量永远不会被替换成真正的 hash。读 main.htm 里设置的全局变量，
			// 那一行在 .htm 文件里，能被正常替换。
			script.src = src + window.__ASSET_VERSION_QS__;
			script.onload = resolve;
			script.onerror = reject;
			document.body.appendChild(script);
		});
	}

	// 左下角关机/重启按钮：core 统一生成一份挂到 body 上，同时摘掉老主题包里残留的那两个按钮。
	// 必须排在这里——要等页面片段注入完（老按钮此时才在 DOM 里，才摘得掉），又要赶在
	// hideBootLoading() 之前（整个过程还被开机黑屏盖着，看不到旧按钮一闪而过），
	// 也在下面那次 translate_obj(document.body) 之前（新按钮的 title 跟着一起翻译）。
	(() => {
	const POWER_BUTTONS_BAR_ID = 'icc-power-bar';

	// 主题包里可能还带着的旧按钮。分支 A 的本地主题文件由 iCafeCloud Server 下发，版本比云端代码旧，
	// 所以这一步不能省；两个选择器就是两个主题历来用的类名。
	function remove_theme_power_buttons() {
		document.querySelectorAll("a.power-button, a.reboot-button").forEach((el) => el.remove());
	}

	function make_power_button(cls, icon, title, onclick) {
		const a = document.createElement("a");
		a.href = "javascript:void(0)";
		// lang：title 由 translate_obj 翻译（translate_node 里对 title 属性有专门处理）。
		// 不加 data-toggle="tooltip"——bootstrap 的 tooltip 初始化会把 title 搬到 data-original-title，
		// 跟 translate_obj 读 title 的时机互相打架，原生 title 提示在这里够用。
		a.className = "icc-power-btn lang " + cls;
		a.title = title;
		a.addEventListener("click", onclick);

		const i = document.createElement("i");
		i.className = icon;
		a.appendChild(i);
		return a;
	}

	// 幂等：重复调用只会把上一份拆掉重建，不会叠出两排按钮。
	const mount_power_buttons = ()=> {
		remove_theme_power_buttons();

		const old = document.getElementById(POWER_BUTTONS_BAR_ID);
		if (old) old.remove();

		const mode = (window.theSettings && theSettings.client_power_buttons) || "both";
		if (mode == "none") return;

		const bar = document.createElement("div");
		bar.id = POWER_BUTTONS_BAR_ID;

		if (mode == "both" || mode == "shutdown") bar.appendChild(make_power_button("icc-power-btn-shutdown", "fal fa-power-off", "Shutdown", shutdown_click));
		if (mode == "both" || mode == "reboot") bar.appendChild(make_power_button("icc-power-btn-reboot", "fal fa-rotate-right", "Reboot", reboot_click));

		document.body.appendChild(bar);
		// 挂载点在 loadThemeBootstrap() 里，紧接着就有一次 translate_obj(document.body) 覆盖到这里；
		// 这一行是给别处（将来可能的手工重挂）兜底的，translate_obj 幂等，多跑一次没有副作用。
		translate_obj(bar);
	};
	mount_power_buttons();
})();

	console.log('[bootstrap] boot chain done');
	if (window.hideBootLoading) window.hideBootLoading();
	translate_obj(document.body);
}
