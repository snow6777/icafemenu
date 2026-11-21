
/**
 * 2025 08
 * icafememu core functions
 */
// window.CallFunction = window.CallFunction || function (cmd) { console.log("CallFunction: " + cmd); };

// pc enabled states
const PC_ENABLED_MAINTENANCE    = 0;
const PC_ENABLED_NORMAL         = 1;
const PC_ENABLED_LOGIN_LOCKED   = 2;

// member group id
const MEMBER_GROUP_DEFAULT = 0;
const MEMBER_GROUP_GUEST = -1;
const MEMBER_GROUP_PREPAID = -2;
const MEMBER_GROUP_POSTPAID = -3;
const MEMBER_GROUP_OFFER = -4;
const MEMBER_GROUP_FREE = -5;

// order payment method
const PAY_METHOD_PAY_LATER = -2;
const PAY_METHOD_CASH = 1;
const PAY_METHOD_BALANCE = 0;
const PAY_METHOD_CARD = 2;
const PAY_METHOD_COIN = 3;
const PAY_METHOD_QR =   4;
const PAY_METHOD_CASH_FOR_OFFER = 11;
const PAY_METHOD_BALANCE_FOR_OFFER = 10;
const PAY_METHOD_CARD_FOR_OFFER = 12;
const PAY_METHOD_COIN_FOR_OFFER = 13;
const PAY_METHOD_QR_FOR_OFFER   = 14;
const PAY_METHOD_CASH_FOR_PC_TIME = 21;
const PAY_METHOD_BALANCE_FOR_PC_TIME = 20;
const PAY_METHOD_CARD_FOR_PC_TIME = 22;
const PAY_METHOD_QR_FOR_PC_TIME = 23;
const PAY_METHOD_QR_FOR_STATIC = 24; // CP 静态/手动 QR（商品订单），与网关 QR(PAY_METHOD_QR=4)区分；展示并入 QR
const PAY_METHOD_CASH_FOR_BOOKING = 31;
const PAY_METHOD_BALANCE_FOR_BOOKING = 30;
const PAY_METHOD_CARD_FOR_BOOKING = 32;
const PAY_METHOD_QR_FOR_BOOKING = 33; // Portal 预订走网关 QR，待付时也要显示为 QR

// order status
const ORDER_STATUS_PENDING = 1;
const ORDER_STATUS_DONE = 2;
const ORDER_STATUS_CANCEL = 3;
const ORDER_STATUS_IN_PROCESS = 4;
const ORDER_STATUS_PREPARING = 5;

const GAME_TYPE_NORMAL = 1;
const GAME_TYPE_EPIC = 2;
const GAME_TYPE_BATTLE = 3;
const GAME_TYPE_EA = 4;
const GAME_TYPE_STEAM = 5;
const GAME_TYPE_RIOT = 6;
const GAME_TYPE_ROCKSTAR = 7;
const GAME_TYPE_UPLAY = 8;
const GAME_TYPE_VKPLAY = 9;
const GAME_TYPE_WINAPP = 10;
const GAME_TYPE_LESTA = 11;
const GAME_TYPE_GAMELOOP = 12;
const GAME_TYPE_BATTLESTATE = 13;
// tax id
const PC_TIME_TAX_ID = 4;

const PC_CONSOLE_PC = 0;
const PC_CONSOLE_OTHER = 1;
const PC_CONSOLE_XBOX = 2;
const PC_CONSOLE_PS3 = 3;
const PC_CONSOLE_PS4 = 4;
const PC_CONSOLE_PS5 = 5;
const PC_CONSOLE_WII = 6;
const PC_CONSOLE_TABLE = 7;
const PC_CONSOLE_ASSISTANT = 8;

const GAME_TYPE_NAMES = ['None', 'Normal', 'Epic', 'Battle.net', 'EA', 'Steam', 'Riot', 'Rockstar', 'Uplay', 'VK Play', 'Windows App'];

const PRODUCT_ICAFEMENU = 0;
const PRODUCT_ICAFECLOUD = 1;
const PRODUCT_CCBOOTCLOUD = 2;
const PRODUCT_CCBOOTCLOUDX = 3;

const PRODUCT_GROUP_OFFERS = -1;
const PRODUCT_GROUP_COINS = -2;
const PRODUCT_GROUP_ALL = -3;
const PRODUCT_GROUP_PROMOTED = -4;

const THEME_ICAFEMENU = 'icafemenu';

const RESET_PASSWORD_DEFAULT = 0;
const RESET_PASSWORD_SMS = 1;
const RESET_PASSWORD_EMAIL = 2;


const ICAFEMENU_CORE = {
	_main_path:'',
	/**
	 * client root path
	 */
	root_path(path){
		// /html/
		let root = this._main_path
		// start url scheme like http:// or https:// or ftp:// or file:// or c:/ or d:/
		if(/^\w+:\/\//i.test(path)){
			return path;
		}
		// windows path like c:\ or d:\.
		if(/^\w:\\/i.test(path)){
			return path;
		}
		// network share path \\server\share or //server/share
		if(/^\\\\.+/.test(path) || /^\/\/\.+/.test(path)){
			return path;
		}
		// 去掉文件名，只保留路径
		return root + (path||"").replace(/^\//,'')
	},
	/**
	 * 内置素材（core/videos/xxx、core/images/xxx）在"本机确实有一份"时的本地访问地址。
	 * 经典客户端（分支 A，window.theBootstrap 不存在）：页面本身就是从本机磁盘加载的，relative 路径直接命中，走 root_path()。
	 * remote UI（分支 B，window.theBootstrap 存在）：页面是从服务器 https 加载的，libcef 不允许这类页面访问 file://
	 * （即使能从 theGames 里 iCafeMenu 包的 pkg_local_path 拼出本机路径也会被拦截），所以一律返回 null，
	 * 由调用方决定兜底方案（图片兜底服务器自己的 /client/core/images/，视频兜底 CDN，因为服务器没有 core/videos/ 这个目录）。
	 * @param {string} path 'core/videos/xxx' 或 'core/images/xxx'
	 * @returns {string|null}
	 */
	local_asset_path(path){
		if (!window.theBootstrap)
			return this.root_path(path);
		return null;
	},
	/**
	 * client posters path
	 * 分支 A（本地 file://，window.theBootstrap 不存在）：保持原样，本地相对路径，exe 已经把图片下载到本地
	 * html/posters/ 目录（见 icafemenu 仓库 iCafeMenu.cpp::DownloadiCafeJs()）。
	 * 分支 B（远程 https）：posters/ 目录在服务器上不存在任何文件，改为直接拼 clientapi.php 对应图片端点的
	 * URL。文件名前缀跟资源类型一一对应、不会冲突（跟原生下载落盘时的文件名规则一致）：
	 *   纯数字            → 游戏 poster（type=poster）
	 *   p-<id> / o-<id>   → 商品 / Offer 图片（type=picture&from=product，id 原样带前缀传递）
	 *   ns-<id>           → 公告图片（from=cafe_news）
	 *   mg-<id>           → 会员分组图标（from=member_group）
	 *   pg-<id>           → 商品分组图标（from=product_group）
	 *   cafe_info_cafe_*  → 网吧配置图片：logo/背景/登录页（from=config）
	 * t/sid 复用 main.htm 自举阶段从 gamecenter.php 拿到的凭证（同一套 Helper::verifySid 校验体系，
	 * payload 都是 t 本身，不需要单独申请）。
	 * @param {*} path
	 * @returns
	 */
	posters_path(path){
		const b = window.theBootstrap;
		if (!b) {
			return this.root_path() + 'posters/' + (path||"").replace(/^\//,'');
		}
		const name = (path||"").replace(/^\//,'').replace(/\.(jpg|jpeg|png)$/i, '');
		const qs = `icafe_id=${encodeURIComponent(b.icafe_id)}&t=${encodeURIComponent(b.t)}&sid=${encodeURIComponent(b.sid)}`;
		if (['cafe_info_cafe_logo', 'cafe_info_cafe_background', 'cafe_info_cafe_login'].includes(name)) {
			return `/api/clientapi.php?type=picture&from=config&id=${name}&${qs}`;
		}
		if (name.startsWith('ns-')) {
			return `/api/clientapi.php?type=picture&from=cafe_news&id=${encodeURIComponent(name.substring(3))}&${qs}`;
		}
		if (name.startsWith('mg-')) {
			return `/api/clientapi.php?type=picture&from=member_group&id=${encodeURIComponent(name.substring(3))}&${qs}`;
		}
		if (name.startsWith('pg-')) {
			return `/api/clientapi.php?type=picture&from=product_group&id=${encodeURIComponent(name.substring(3))}&${qs}`;
		}
		if (name.startsWith('p-') || name.startsWith('o-')) {
			return `/api/clientapi.php?type=picture&from=product&id=${encodeURIComponent(name)}&${qs}`;
		}
		// 纯数字：游戏 poster，需要额外的 pc_name 参数
		return `/api/clientapi.php?type=poster&pc_name=${encodeURIComponent(b.pc_name)}&id=${encodeURIComponent(name)}&${qs}`;
	},
	/**
	 * 背景/登录页/生日动画视频路径（client_bg_video / client_login_video / birthday_animation 配置值，
	 * 以及 pc_group_background 分组覆盖的视频）。这几个配置项有两种取值（见 settings-cafe.htm）：
	 *   1. 预置素材，存的是 'core/videos/<filename>'——这批 webm 文件随 icafemenu 安装包分发到本机安装目录的
	 *      core/videos/ 下（不是服务器 api/public/v0/client/core/videos/ 目录下的静态文件，这个目录在仓库里
	 *      根本不存在）。经典客户端优先走 local_asset_path() 读本机文件；remote UI 下 libcef 无法从 https 页面
	 *      访问 file://，local_asset_path() 返回 null，兜底走 CDN https://update.youngzsoft.com/icafecloud/update/client-video/
	 *      （CP 设置页自己预览时用的就是这个 CDN 地址，见 settings-cafe.htm 里 client-video-preview 那两处 <video :src>）。
	 *   2. "Customized" 自定义值，管理员直接填完整 URL / 本机路径 / 网络共享路径，原样透传（这种情况下
	 *      如果填的是本机路径，浏览器本来就访问不到，是配置层面的限制，不是这里能处理的）。
	 * @param {*} path
	 * @returns
	 */
	videos_path(path){
		path = path || '';
		if (!path.startsWith('core/videos/')) {
			return path;
		}
		return this.local_asset_path(path) || ('https://update.youngzsoft.com/icafecloud/update/client-video/' + path.substring('core/videos/'.length));
	},
	/**
	 * client icons path
	 * @returns
	 */
	icons_path(path){
		return this.root_path() + 'icons/' + (path||"").replace(/^\//,'')
	},
	// images_path 原来这里也有一份，全局零调用，是路径解析家族里唯一没人用的一个，删掉。
	/**
	 * client core  path
	 * @returns
	 */
	core_path(path){
		return this.root_path() + 'core/' + (path||"").replace(/^\//,'')
	},
	// sleep 原来这里也有一份，但全局零调用（连内部 this.sleep() 也没有），是纯死代码，删掉。
	// debounce/throttle 原来这里也有一份，但两个都没有任何开机阶段（bootstrap.js/apiclient.js）
	// 的早绑定要求，全部调用点都在主题加载完之后才会跑（main.js/login.js/helper.js），已经搬去
	// core/js/helper.js 做成裸全局函数，以那份为准。

	// format_time/format_datetime/sha256/htmlToText 原来这里也各有一份，跟 core/js/helper.js 的
	// 同名函数逐字节重复；核实过整个客户端代码库没有一处通过 ICAFEMENU_CORE. 前缀调用它们（全部
	// 调用点都走 helper.js 的裸函数），是纯死代码，删掉，以 helper.js 那份为准。
	sendCommandToExe(cmd, paramString = "") {
		const data = `${cmd} ${paramString}`.trim();
		// console.log(`CallFunction: ${data}`);
		// 纯浏览器环境（比如在 Chrome 里手工打开 main.htm 联调）没有原生桥接，CallFunction 是未定义的裸标识符，
		// 调用会直接抛 ReferenceError 中断当前同步流程；这里降级为警告，避免一次原生调用缺失拖垮整条初始化链路
		// （比如 initApp() 里排在 sendCommandToExe 后面的 wssStart()）。
		if (typeof CallFunction !== 'function') {
			return;
		}
		CallFunction(data);
	},
	// 分支 B：从服务器直接播放，无需本地 html/sounds/ 目录；分支 A：走 C++ 原生桥读本地文件。
	// files 数组按优先级排列，例如 ['customized/admin-message.wav', 'ru/admin-message.wav', 'admin-message.wav']。
	// customized/ 前缀的文件仅存在于本地，分支 B 跳过。
	playSound(files) {
		if (window.theBootstrap) {
			const f = files.find(f => f && !f.trim().startsWith('customized/'));
			if (f) new Audio(window.location.origin + '/client/sounds/' + f.trim()).play().catch(() => {});
		} else {
			this.sendCommandToExe('PLAYSOUND ' + files.map(f => f.trim()).join(' '));
		}
	},

	// 下面这些属性原来是通过 Object.assign(ICAFEMENU_CORE, {...}) 追加的：早前 send_assist 那个
	// 属性的值是 CORE.throttle(...) 这种立即求值的写法，构造时就要立即访问 ICAFEMENU_CORE 自己，
	// 而 const 声明在初始化表达式算完之前变量名不可用（暂时性死区），所以当时必须拆成两步——
	// 先让 ICAFEMENU_CORE 绑定完成，再用 Object.assign 追加这类属性。send_assist 是死代码已经
	// 删掉，现在这里没有任何属性会在构造时立即访问 ICAFEMENU_CORE 自己了（onWss 里虽然也提到
	// ICAFEMENU_CORE，但那处引用在嵌套的事件回调函数体内，只有等事件真正触发才会执行，闭包创建
	// 时不需要这个变量已经存在），于是合并回同一个字面量。
	// countdown 原来这里也有一份，是个 { start(){throw...}, stop(){throw...} } 的桩，全局零调用；
	// helper.js 里有三个真正实现、真正在用的同名函数 countdown()/countdown_start()/
	// countdown_stop()（listen.js/game.js 在调），跟 ui_init/getMemberInfo 是同一类死代码，删掉。

	// unlock_all 原来这里也有一份，跟 core/js/helper.js 的同名函数逐字节重复；这个原本两边都真的
	// 在被调用（不是死代码），已经把 listen.js/login.js 里 7 处 ICAFEMENU_CORE.unlock_all() 统一
	// 改成裸调用 unlock_all()，跟其它调用点一致，这里删掉，以 helper.js 为准。
	// lastWindowSize/resizeWin/minisize 原来这里也有一份：minisize() 全局零调用，是死代码；
	// resizeWin(size) 只有 login.js 一处真调用（内部 ICAFEMENU_CORE.lastWindowSize = size 这行
	// 也从未被读取过，是死写入），而它想封装的 sendCommandToExe("SETWINDOWSIZE "+x)+theLastWindowSize=x
	// 这个模式，实际上已经在 helper.js/layout.js/listen.js（×3）/main.js 六处地方手写了一遍，
	// resizeWin 并没有成为唯一用法，价值有限，删掉，login.js 那一处改成跟其它 6 处一样直接手写。
	// shutdown/reboot 原来这里也有一份，全局零调用：真正生效的路径是 helper.js 的
	// confirm_shutdown_submit/confirm_reboot_submit，各自独立调用同样的
	// sendCommandToExe('SHUTDOWN ONLY'/'SHUTDOWN REBOOT')，完全不经过这两个方法，是重复实现的
	// 死代码，删掉。
	// run_protect/unlock_pc/open_url 原来这里也各有一份，跟 core/js/helper.js 的同名函数逐字节
	// 重复，同样确认过零调用（helper.js 那份才是实际被调用的），删掉。
	/**
	 * send wss command
	 * @param {*} cmd
	 */
	wsssend(action, type, target, data, from = 'client', version = 2) {
		let cmd = { action, type, target, data, from, version }
		// 远程化改造：分支 B 下浏览器自己连着 wss（core/js/wss-client.js 设置的 window.theWssClient），
		// 直接从这发；分支 A 没有这个全局对象，走原来的原生桥接路径不变
		if (window.theWssClient && window.theWssClient.isLogined()) {
			window.theWssClient.send(JSON.stringify(cmd));
		} else if (!window.theBootstrap) {
			// 分支 A：原生桥接；分支 B 下 WS 未登录时静默丢弃，不回落到未连接的 C++ theWssClient
			ICAFEMENU_CORE.sendCommandToExe('WSSSEND ' + JSON.stringify(cmd));
		}
	},
	/**
	 * 启动 wss 连接。
	 * 分支 A：走原生桥接 CallFunction("WSSSTART")，原生自己连 wss（不变）。
	 * 分支 B：window.theBootstrap 在 main.htm 自举时已经设置好，用浏览器自己的
	 * core/js/wss-client.js（window.WssClient）直接连接，不经过原生。
	 */
	wssStart() {
		if (window.theBootstrap && window.WssClient) {
			console.log('[bootstrap] wssStart: path B, connecting via window.theWssClient...');
			const b = window.theBootstrap;
			window.theWssClient = window.theWssClient || new WssClient();
			window.theWssClient.asClient(b.icafe_id, b.pc_name, b.ip, b.mac, b.t, b.sid);
			window.theWssClient.connect();
		} else {
			console.log('[bootstrap] wssStart: path A, calling native WSSSTART...');
			ICAFEMENU_CORE.sendCommandToExe('WSSSTART');
		}
	},
	// send_assist 原来这里也有一份，跟 core/js/helper.js 的同名函数重复，同样确认过零调用，删掉。

	// getGameName/getSupportedGames/getEnabledGames/getGameNameByMatchStatsType/getGameCode2Names
	// 这一簇"游戏名称"相关函数原来这里也各有一份，但彼此之间只互相调用（都靠 this.getSupportedGames()
	// 这种内部依赖串起来），核实过对外零调用；helper.js 里有独立的一份同名实现，被 event.js/listen.js
	// 实际使用，删掉这一簇，以 helper.js 为准。
	// getMemberInfo/ui_init 原来这里也各有一份，但都是零调用死代码：getMemberInfo 读
	// localStorage.getItem('clientMemberInfo')，全局没有一处通过 ICAFEMENU_CORE.getMemberInfo()
	// 调用它，实际起作用的是 core/js/login.js 的 Login 构造函数的 theLogin.getMemberInfo()
	// （委托给 apiclient.js 的 theApiClient.getMemberInfo()，是完全不同的数据来源）；ui_init 干脆就是个
	// throw new Error('Not impl ui_init') 的桩，core/js/helper.js 里有真正实现的同名
	// ui_init(translate = true)，全部 22 处调用点走的都是裸调用，命中的是 helper.js 那份。
	/**
	 * 语言包路径（js/lang/<code>.json 和兜底的 js/locale.js）。
	 * 分支判别沿用 posters_path 那一套：window.theBootstrap 只有分支 B 才有。
	 *
	 * 分支 A（本地 file://）：语言包跟 js/icafe.js 一样，是 exe 下载到本地 html/js/ 的文件，
	 *   用 root_path 定位（js/icafe.js 本身也是这样用 root_path('js/icafe.js') 定位的）。
	 * 分支 B（远程 https）：**不能**用 root_path —— 那会拼成 /client/js/，而 client/js/ 不是
	 *   部署产物（根 .gitignore 排除了它，git 里也有一次 "add client js folder" 又被 Revert），
	 *   服务器上根本没有这个目录。远程的语言包在服务器根的 /js/ 下，就是 CP 用的那一份
	 *   api/html/js/，由 deploy.sh 同步。
	 */
	lang_path(file) {
		if (!window.theBootstrap)
			return this.root_path('js/' + file);

		return '/js/' + file;
	},

	// LANG_FETCH_TIMEOUT/load_lang/load_script/apply_lang/translate_string/translate_source/
	// translate_attr/translate_node/translate_obj 原来这里也有一份，但它们对外的唯一早绑定
	// 要求（bootstrap.js 的 loadLangPack() 在开机阶段直接调用 apply_lang）已经不成立了——
	// core/js/helper.js 现在改成顶层 main.htm 静态加载，跟 core.js 一样早，bootstrap.js 运行时
	// helper.js 已经加载完。翻译运行时本身也更像"作用于全部页面内容的通用能力"，不像
	// lang_path 这类跟 window.theBootstrap 分支A/B 部署拓扑强绑定的东西，整套搬去 helper.js，
	// lang_path 留在这里（继续跟 posters_path 等路径解析家族在一起）。

	/**
	 * 订阅一个原生命令（OnCommand(strCmd, strParam) 派发出的同名 CustomEvent）。
	 * 命名区分 sendCommandToExe（JS→exe 发命令）和 OnCommand（exe→JS 的原始入口，
	 * 外部约定的固定名字不能改）：这个是 JS 侧订阅"某个具体命令到达"的地方。
	 * @param {*} event 命令名，或 "*" 订阅全部
	 * @param {*} callback
	 */
	onExeCommand(event, callback) {
		if(event == "*"){
			event = "_cmd_*"
		}
		window.addEventListener(event, function (e) {
			callback(e.detail.strParam,e.detail.strCmd);
		});
		return this;
	},
	// 旧名字的别名，兼容仓库外可能还在用 onCmd 这个名字的代码（比如网吧自己定制的 js/app.js——
	// 这个文件是主题的"额外脚本"扩展点，不排除有部署在外面、不受这次改名影响的自定义版本）。
	onCmd(event, callback) {
		return this.onExeCommand(event, callback);
	},
	// onCmdOnce（一次性版本）原来这里也有一份，全局零调用，是死代码，删掉。
	/**
	 * 校验并派发一个 wss 数据包为 _wss_${action} 系列 CustomEvent。
	 * 远程化改造：原先只有原生 OnCommand('WSS_COMMAND', json) 这一个来源；现在浏览器自己的
	 * core/js/wss-client.js（分支 B）收到 wss 消息后也调用这同一个函数，下游 listen.js/apiclient.js
	 * 完全不用关心 wss 消息到底是原生转发来的还是浏览器自己连的。
	 * @param {*} packet 已经 JSON.parse 过的 wss 数据包
	 */
	dispatchWssPacket(packet) {
		if (typeof (packet.action) == 'undefined' || typeof (packet.version) == 'undefined' || typeof (packet.type) == 'undefined' || typeof (packet.data) == 'undefined' || typeof (packet.from) == 'undefined' || typeof (packet.target) == 'undefined') {
			return;
		}
		if (packet.version != 2 || packet.target != 'client') {
			return;
		}
		if (packet.action === 'client_status' && packet.data?.client_status) {
			['member_balance_realtime', 'member_balance_bonus_left_seconds'].forEach(function(k) {
				if (packet.data.client_status[k] != null) packet.data.client_status[k] = Number(packet.data.client_status[k]) || 0;
			});
		}
		// console.log(`WSS Command: ${packet.action}`, JSON.stringify(packet ?? []));
		window.dispatchEvent(new CustomEvent(`_wss_${packet.action}`, { detail: packet }));
		window.dispatchEvent(new CustomEvent(`_wss_${packet.action}.${packet.type}`, { detail: packet }));
		window.dispatchEvent(new CustomEvent(`_wss_*`, { detail: packet }));
	},
	/**
	 * wss action listener
	 * 多个事件逗号隔开
	 * @param {*} action[.type][,action[.type]]
	 * @param {*} callback(packet)
	 * @returns
	 */
	onWss: (() => {
		window.addEventListener('WSS_COMMAND', function (e) {
			const packet = JSON.parse(e.detail.strParam);
			ICAFEMENU_CORE.dispatchWssPacket(packet);
		});
		return function (action_event, callback) {
			if (!action_event) return this;
			action_event.split(',').forEach(action_type => {
				window.addEventListener(`_wss_${action_type}`, function (e) {
					callback(e.detail);
				});
			})
			return this;
		}
	})(),
	// onWssOnce（onWss 的一次性版本）原来这里也有一份，全局零调用，是死代码，删掉。
};

const OnCommand = function (strCmd, strParam,source='exe') {
	strParam = strParam?.replace(/____@@@____/g, '\\') || ''
	strParam = strParam.replace(/____@@____/g, '"')
	strParam = strParam.replace(/____@____/g, '\'')
	strParam = strParam.replace(/___@@@@___/g, '\r')
	strParam = strParam.replace(/___@@@@@___/g, '\n')
	//console.debug("OnCommand",source,strCmd,strParam)
	window.dispatchEvent(new CustomEvent(strCmd, { detail: {strCmd,strParam} }));
	window.dispatchEvent(new CustomEvent(`_cmd_*`, { detail:  {strCmd,strParam} }));
}

// todo: 迁移兼容 OnCommand
window.addEventListener('load', () => {
	let param = new URLSearchParams(location.search);
	if (!param.get('OnCommand')) {
		return
	}
	let list = JSON.parse(param.get('OnCommand')) || [];
	list.forEach(({ strCmd, strParam }) => {
		OnCommand(strCmd, strParam,'query');
	})
})
// /html/main.htm => /html/
ICAFEMENU_CORE._main_path = location.pathname.replace(/\/[^\/]+$/,'/')
Object.freeze(ICAFEMENU_CORE);
console.debug('ICAFEMENU_CORE initialized', ICAFEMENU_CORE);

// Global Alt + F4 listener to allow cleanly exiting the app
window.addEventListener('keydown', function (e) {
	if (e.altKey && (e.keyCode === 115 || e.key === 'F4')) {
		e.preventDefault();
		e.stopPropagation();
		console.log('[Alt+F4] Triggering exit via ICAFEMENU_CORE');
		ICAFEMENU_CORE.sendCommandToExe("EXIT");
	}
}, true);

// window.addEventListener('error',e=>alert(`Error: ${e.message}\n${e.filename}:${e.lineno}:${e.colno}`));