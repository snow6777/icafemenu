

// theSettings（icafe.js 定义的全局配置）里这些字段做默认值补全/格式规整。原来是裸的顶层语句，
// 脚本一加载就立刻跑；改成命名函数、由 initApp() 显式调用——下面 initRankItems() 依赖这里已经
// 补好 theSettings.game_rank_options_*，调用顺序必须排在它前面。
function applySettingsDefaults() {
	theSettings.allow_prepaid_checkout ??= 0;
	theSettings.mini_qr_payment ??= 0;
	theSettings.join_us ??= '';
	theSettings.social_login ??= 0;
	theSettings.allow_password_login_always ??= 0;
	if (!Array.isArray(theSettings.price_button)) {
		try {
			theSettings.price_button = JSON.parse(theSettings.price_button);
		} catch (e) {
			theSettings.price_button = [];
		}
	}

	theSettings.price_button = (theSettings.price_button||[])
		.map(item => ({
			min: String(item?.min ?? '').trim(),
			money: String(item?.money ?? '').trim()
		}))
		.filter(item => item.min !== '' && item.money !== '');

	theSettings.game_rank_options_fortnite = (JSON.parse(theSettings.supported_games)?.fortnite?.rank_options) ?? 1;
	theSettings.game_rank_options_pubg = (JSON.parse(theSettings.supported_games)?.pubg?.rank_options) ?? 1;
	theSettings.game_rank_options_lol = (JSON.parse(theSettings.supported_games)?.lol?.rank_options) ?? 1;
	theSettings.game_rank_options_dota2 = (JSON.parse(theSettings.supported_games)?.dota2?.rank_options) ?? 1;
	theSettings.game_rank_options_valorant = (JSON.parse(theSettings.supported_games)?.valorant?.rank_options) ?? 1;
	theSettings.game_rank_options_csgo = (JSON.parse(theSettings.supported_games)?.csgo?.rank_options) ?? 1;
	theSettings.game_rank_options_apex = (JSON.parse(theSettings.supported_games)?.apex?.rank_options) ?? 1;
	theSettings.bonus_buy_offer ??= 0;
	theSettings.use_bonus_first ??= 1;
	theSettings.max_bonus_percentage ??= 100;
}

var thePCStatus = { member_account: '', available_offers: [] };
var theLockScreenPassword = '';
var theWssLogined = false;
var theClientStatusInitialized = false; // when first wss connected, received client_status package from idc.
var theLastWindowSize = '';
var theMonitorTurnOffStartTime = 0;
var theIsHomeVersion = false;

// times
var theIdleMonitorTimerId = null;
var theCountDownIntervalId = null;
var theAutoCheckoutTimeoutId = null;
var theQueryRunGameIdsIntervalId = null;
var theMonitorTurnOffIntervalId = null;
var theAvailableOffers = [];
var theGameTrackerInterval = null;

var	theHome = new Home();
var	theTax = new Tax();
var	theShop = new Shop();
var	theShopPrint = new ShopPrint();
var	theGame = new Game();
var theGameList = theGame; // @deprecated 用 theGame，GameList 改名 Game 前的旧实例名，别名同一实例（不是新 new 一份，避免状态跟 theGame 分叉）
var	theEvents = new Events();
var	theRank = new Rank();
var	theTopupLogin = new TopupLogin();
var	theMemberLogin = new MemberLogin();
var	theMemberRegister = new MemberRegister();
var	theForgotPassword = new ForgotPassword();
var	theAudioSettings = new AudioSettings();
var	theMouseSettings = new MouseSettings();
var theStartSession = new StartSession();
var theListen = new Listen();
var theMember = new Member();
var theMemberBind = new MemberBind();
var theEventJoinQr = new EventJoinQr();
var theLockScreen = new LockScreen();
var theSystemMenu = new SystemMenu();
var theLogin = new Login();
var theSession = new Session();
var theScanLogin = new ScanLogin();
var theOfferSwitch = new OfferSwitch();
// 跟其它 theXxx 实例不同，这个要用 PetiteVue.reactive() 包一层：模板直接读它的属性做响应式绑定
// （见 home.js 里 SpinWheel 构造函数上方的说明），普通实例改属性不会触发视图更新。
var theSpinWheel = PetiteVue.reactive(new SpinWheel());

// avoid multiple submit


///////////////////////////////////// share functions  ////////////////////////////////////////////

///////////////////////////////////// form submit ////////////////////////////////////////////

///////////////////////////////////// element click events ////////////////////////////////////////////

///////////////////////////////////// message process ////////////////////////////////////////////
///////////////////////////////////// UI ////////////////////////////////////////////

// <lang> No permission </lang>
// <lang> Account not exists </lang>
// <lang> Wrong password </lang>
// <lang> Operation failure </lang>
// <lang> Invalid parameter </lang>
// <lang> The password was changed successfully. </lang>
// <lang> Invalid client </lang>
// <lang> Invalid parameter </lang>
// <lang> Update client information failed </lang>
// <lang> Invalid license </lang>
// <lang> Account already exists </lang>
// <lang> Free to play </lang>
// <lang> All Games </lang>
// <lang> Favorite </lang>
// <lang> Drink </lang>
// <lang> Food </lang>
// vueGlobal 是新主题的 HTML 需要遵守的公开约定，core/js 这边只负责维护这些字段的值，
// 具体展示效果（CSS class 绑定、显示/隐藏）由主题自己的 HTML 决定：
// - isHomeVersion / isDualMonitor / isDualMonitorHeight：由 onWindowResize（本文件）维护。
//   isDualMonitor/isDualMonitorHeight 表示客户端窗口横向/纵向跨了双屏，登录态以外的弹窗/锁屏类
//   页面通常要 :class="{'w-50': vueGlobal.isDualMonitor, 'h-50': vueGlobal.isDualMonitorHeight}"
//   把自己约束在左屏，登录后的正常页面（游戏/商城等）不需要处理，见项目 CLAUDE.md"客户端主题双屏
//   支持"一节，两个主题目前在 login.htm/layout.htm 的 #page_lock 等元素上按这个约定加了 class。
// - modals：所有弹窗统一走 vueGlobal.modals.<name> 布尔值控制显示，不使用 Bootstrap JS 的
//   .modal('show')。新增弹窗要在这里补一个 <name>: false 初始值，弹窗 HTML 用
//   :class="{show: vueGlobal.modals.xxx}" + :style="{display: ... ? 'block' : 'none'}"，关闭按钮用
//   @click="vueGlobal.modals.xxx = false"，不要用 data-dismiss="modal"（不生效）。icafemenu 主题额外
//   靠 modals 是否有任意值为 true 来控制一个全局 backdrop 遮罩，新主题要不要做这个效果自行决定。
var vueGlobal = PetiteVue.reactive({
	pageType: 'Home',
	showBottom: true,
	// bodyStyle 用于绑定 body 的 style 属性
	// bodyStyle 用于绑定 body 的 style 属性
	backgroundImage: '',
	get bodyStyle() {
		if (this.backgroundImage) {
			return {
				backgroundImage: this.backgroundImage,
				backgroundSize: 'cover',
				backgroundPosition: 'center'
			};
		}
		// 视频背景是 position:fixed; z-index:-1 的 <video>，画在根层的负层，会被外层容器自己的底色盖住：
		// purple 主题的 .theme-purple 给这个容器设了不透明底色 --purple-ground，视频模式下整个看不见。
		// 视频可见时把容器底色清成透明（内联样式优先于主题 CSS；其他主题的容器本来就是透明的，不受影响）
		if (this.videoBackground?.visible) {
			return { backgroundColor: 'transparent' };
		}
		return {};
	},
	menuButton: {
		logout: true,
		feedback: true,
		assist: true,
		changepassword: false,
		convertToMember: true,
	},
	showOrderList: false,
	license_server_code: '',
	// 密码可见性切换状态（unlock, lock, change password 模态框）
	showUnlockPassword: false,
	showLockPassword: false,
	showOldPassword: false,
	showNewPassword: false,
	showConfirmPassword: false,
	// Map UI state to variables
	isLoading: false,
	// 收到第一条 client_status 之前，客户端还不知道这台 PC/这次连接的真实状态（有没有正在使用、
	// 有没有预约锁定等），登录按钮不应该允许在这之前被点击；wss_client_status() 收到消息后置 true
	wssConnected: false,
	isGiftCart: false,
	cartDate: '',
	videoBackground: {
		visible: false,
		src: '',
		type: ''
	},
	// 省电模式（玩家进游戏后冻结界面动画，见 helper.js 的 power_save_set）。
	// 这里只有 youtube 背景那个 iframe 需要读它——iframe 没法像 <video> 那样直接 pause，
	// 只能靠置空 src 把播放器整个卸掉，所以必须是个 vue 响应式状态。
	powerSave: false,
	sms: {
		text: translate_string('Get Code'),
		disabled: false
	},
	memberSettings: {},
	currentTime: '',
	// 聊天抽屉未读数(由 chat-drawer.htm 同步过来,layout.htm dropdown 显示红 badge)
	chatUnread: 0,
	modals: {
		orderList: false,
		balanceHistory: false,
		feedback: false,
		lock: false,
		changePassword: false,
		convertMember: false,
		topup: false,
		login: false,
		register: false,
		forgotPassword: false,
		print: false,
		runGame: false,
		gameLicense: false,
		avatar: false,
		confirmCheckout: false,
		confirmShutdown: false,
		confirmReboot: false,
		buy: false, // .myModalBuy
		joinEvent: false, // .myModalJoinEvent
		joinEventTerms: false, // .myModalJoinEventTerms（旧的直接加入模式才用）
		scanRegister: false, // .myModalQRMemberRegister
		scanLogin: false, // .myModalTopupLogin
		topupLogin: false, // .myModalTopupLogin (duplicate usage check needed)
		clubRules: false,
		personalData: false,
		bookingPassword: false,
		audio: false,
		mouse: false,
		registerMember: false, // .myModalRegisterMember
		checklist: false,
		language: false,
		offerSwitch: false,
		spinWheel: false, // .myModalSpinWheel 每日转盘抽奖
		verifyIdentity: false, // .myModalVerifyIdentity，wss status_pc_token 不匹配时要求补充账号密码
		bindApp: false, // .myModalBindApp 会员绑定 App 账号二维码
	},
	selectedLanguage: '',
	// Page routing state
	currentPage: 'home', // 'home', 'games', 'shop', 'events', 'rank', 'login', 'start-session'
	isLocked: false,
	// 'user' = user-initiated lock (show password), 'maintenance' = pc_enabled=0, 'station_lock' = pc_enabled=2
	lockMode: null,
	isGiftCart: false,
	joinEventId: '',
	joinEventTermsAgreed: false,

	bodyClass: '',
	currentView: 'login',
	// UI state from listen.js refactoring
	currency: '$',
	showOffersDiv: false,
	memberGroupId: 0,
	runningGames: [],
	pcName: '',
	pcNameFontSize: '40px', // PC 名称字体大小
	versionDate: '',
	isHomeVersion: false,
	isHomeCafeId: false,
	isDualMonitor: false,
	isDualMonitorHeight: false,
	loginSubView: 'login', // 'login', 'admin_exit', 'register', 'homecafeid'
	pagesContent: {}, // Store loaded page HTML content
	thePCStatus: thePCStatus,
	theSettings: theSettings,
	currentSystemLanguage: 'EN',
	offerPage: 0,
	availableOfferPage: 0,
	showMyOffers: false,

	/* 切换界面语言（Language 弹窗的 Apply 按钮）。
	 *
	 * 语言包已经改成按语言加载（js/lang/<code>.json，只下当前语言那一份），所以切语言
	 * 必须先把新语言的包拉下来，再重新翻译页面——原来这里是内联在模板 @click 里的一行
	 * translate_obj，整包时代所有语言都在 theLangStrings 里才碰巧成立，改成按语言加载后
	 * 就会出现「语言码切了、包还是旧的」，界面纹丝不动。
	 *
	 * 拉包 + 整包兜底 + 重新翻译都在 helper.js 的 apply_lang 里，跟客户端引导时走同一个入口。
	 */
	async applyLanguage() {
		const code = this.selectedLanguage || theSettings.license_lang || 'en';
		try {
			await apply_lang(code);
		} catch (e) {
			console.error('[lang] applyLanguage failed', e);
		}
		this.modals.language = false;
	},
});

var vueShop = PetiteVue.reactive({
	searchProduct: ''
});

var vueOrderList = PetiteVue.reactive({
	items: [],
	paging_info: []
})

var vueChecklistInfo = PetiteVue.reactive({
	orders: [],
	pc: [],
	member: [],
})

var order_filter_params = PetiteVue.reactive({
	search_text: '',
	sort_name: 'order_create_time',
	sort: 'desc',
	paging_info: {
		total_records: 0,
		pages: 1,
		page: 1,
		page_prev: 1,
		page_next: 1,
		page_start: 1,
		page_end: 1,
	}
})

// 系统设置状态 - 用于音频和鼠标设置的Vue响应式绑定
var vueSystemSettings = PetiteVue.reactive({
	// 音频设置
	volume: 50,
	isMuted: false,
	// 鼠标设置
	doubleClickSpeed: 5,
	moveSpeed: 5,
	mouseSmoothness: false
});

var vueHome = PetiteVue.reactive({
	promotedItems: [],
	promotedActive: 0,
	leaderboardItems: null,
	leaderboardActive: 0,
	memberGroup: [],
	memberCurrentGroup: 0,
	memberPointValue: "",
	promotedGoods: [],
	offerGoods: [],
	currentShopTab: 'promoted',
	currentRankNewsTab: 'news',
	offersActivePage: 0,
	newsActivePage: 0
});
var vueClasses = PetiteVue.reactive({
	items: []
});
var vueGames = PetiteVue.reactive({
	items:[],
	allFilteredItems: [], // 存储所有过滤后的游戏（未切片）
	containerWidth: 0,    // 容器宽度
	containerHeight: 0,   // 容器高度
	topFiveItems: [],
	type: 'all',
	active_class: '',
	status_pc_token: '',
	search: '',
	product_qty_map: {}
});
var vueEventBanner = PetiteVue.reactive({
	event:[]
});
var vueEventsMy = PetiteVue.reactive({
	events:[]
});
var vueEventsActive = PetiteVue.reactive({
		events:[]
});
var vueEventsDetail = PetiteVue.reactive({
	events:[]
});
var vueEventButtons = PetiteVue.reactive({
	event:[]
});
var vueEventDetail = PetiteVue.reactive({
	event:[],
	members: []
});
// 加入 Event 二维码弹窗状态。二维码是静态的，内容直接从活动列表本地取
var vueEventJoin = PetiteVue.reactive({
	eventName: '',
	ticketPrice: 0,
	currency: '',
});
var vueProductGroupList = PetiteVue.reactive({
	items:[],
	tops: [], 
	current_group_id: PRODUCT_GROUP_ALL,
	second_level_group_id: 0,
});
var vueProducts = PetiteVue.reactive({
	items:[]
});
var vueOffers = PetiteVue.reactive({
	items:[]
});
var vuePcTime = PetiteVue.reactive({
	price_dynamic_enable: 0,
	fixed_price: 0,
	dynamic: [],
});
var vuePrint = PetiteVue.reactive({
	blackwhite: null,
	color: null,
	product_id: 0,
	page_count: 0,
	total_cost: 0,
	total_tax: 0,
	total_discount: 0,
	total_amount: 0,
	max_bonuses: 0,
	payable_balance: 0,
	product_count: 0,
	payment_method: -1,
	member_group_discount_rate: 0,
	member_group_discount_offer: 0,
	member_group_id: 0,
	enable_cash: 1,
	enable_credit_card: 1,
	enable_balance: 1,
	enable_qr: 1,
	enable_pay_later: 0,
	total_offer: 0,
	items: [],
})
var vueOrderItems = PetiteVue.reactive({
	items:[],
	total_cost: 0,
	total_tax: 0,
	total_discount: 0,
	total_fee: 0,
	total_amount: 0,
	max_bonuses: 0,
	payable_balance: 0,
	product_count: 0,
	no_common_payment_method: false,
	payment_method: -1,
	member_group_discount_rate: 0,
	member_group_discount_offer: 0,
	member_group_id: 0,
	remark: ''
});
var vueGiftOrders = PetiteVue.reactive({
	items:[],
	total_amount: 0
});
var vueAvailableOffers = PetiteVue.reactive({
	items:[],
	currentIndex: 0
});
var vueCafeNews = PetiteVue.reactive({
	items:[]
});
var memberInfo = PetiteVue.reactive({
	member_name: '',
	member_info_name: '',
	member_balance_realtime: '',
	member_balance: 0,
	member_balance_bonus_realtime: '',
	member_balance_bonus: 0,
	member_coin_balance: '',
	postpaid_pc_name: '',
	price_per_hour: '',
	member_photo: null,
	canChangePassword: true,
	member_loan: 0,
	member_loan_raw: 0,
	pc_cost: 0,
	pc_cost_raw: 0,
	member_group_id:MEMBER_GROUP_GUEST,
});

var vueGameInfo = PetiteVue.reactive({
	game: null,
	source: 'game', //game, home
	show: false,
});

var vueLoginMode = PetiteVue.reactive({
	mode: 'default', // default - old mode; tabs - show tab
	active_tab: 'account', // account, access_code
	view: 'menu', // menu, login, access_code
});

// 扫码登录二维码状态：loading（spinner）/ expired（刷新按钮）/ status（scanned|approved|cancelled，由 WSS scan_status 推送）
var vueScanLogin = PetiteVue.reactive({
	loading: false,
	expired: false,
	status: '',
	statusText: '',
});

// 会员绑定 App 账号弹窗状态。bound 为 true 时显示已绑定的 App 账号，不再出码；
// status 由 WSS member_bind_status 推送
var vueMemberBind = PetiteVue.reactive({
	checking: true,   // 正在查绑定状态，两套布局都先不渲染，免得闪一下二维码
	loading: false,
	expired: false,
	status: '',
	statusText: '',
	bound: false,
	boundEmail: '',
	boundName: '',
	boundAt: '',
});

var vueRank = PetiteVue.reactive({
	items: {},
	active_game: "fortnite",
});
// 依赖 applySettingsDefaults() 已经把 theSettings.game_rank_options_* 补好（getEnabledGames()
// 内部读这几个字段），原来是裸的顶层语句，改成命名函数、由 initApp() 显式调用，紧跟在
// applySettingsDefaults() 后面保持顺序
function initRankItems() {
	getEnabledGames().forEach(game => {
		// 跳过custom游戏
		if (game.key == 'custom') {
			return;
		}
		vueRank.items[game.key] = [];
	});
}

var vueBalanceHistory = PetiteVue.reactive({
	items: [],
	paging_info: [],
	show_summary: true,
	period_days: 30,
	period_label: '',
	summary: {
		topup: 0,
		spend: 0
	},
})

var balanceHistoryFilterParams = PetiteVue.reactive({
	search_text: '',
	start_date: '',
	end_date: '',
	paging_info: {
		total_records: 0,
		pages: 1,
		page: 1,
		page_prev: 1,
		page_next: 1,
		page_start: 1,
		page_end: 1,
	}
})

var vueTopup = PetiteVue.reactive({
	member_account: '',
	topup_amount: '',
	promo_code: '',
	promo_preview: null, // promo code 的预览结果，见 helper.js promo_preview_apply
	payment_qr: '',
	payment_url: '',
	payment_type_img: false, // kaspi 需要在二维码下方额外显示自家 logo
	btn_group: true,
	topup_order_no: '',
	payment_html: '', // 图片类网关（razorpay/manual/paymongo/midtrans/finik）的展示 HTML，由 build_payment_view 生成
	payment_type: '',
	topup_time: '',
	// UI 状态
	showFormRows: true,
	showSummary: false,
	showPaymentQr: false,
	openPresetMenu: '',
	// Summary 显示内容
	summaryMember: '',
	summaryAmount: '',
	summaryMinutes: '',
	// 验证错误消息
	errors: {
		member_account: '',
		topup_amount: '',
		topup_time: '',
		promo_code: ''
	},
	// 清除所有错误
	clearErrors() {
		this.errors.member_account = '';
		this.errors.topup_amount = '';
		this.errors.topup_time = '';
		this.errors.promo_code = '';
	},
	// 重置表单状态
	resetOutputs() {
		this.payment_qr = '';
		this.payment_url = '';
		this.btn_group = true;
		this.topup_order_no = '';
		this.payment_type_img = false;
		this.payment_html = '';
		this.paymentData = null; // 重置支付数据，确保新二维码能正确显示

		this.showPaymentQr = false;
		this.showFormRows = true;
		this.showSummary = false;
		this.openPresetMenu = '';
		this.summaryMember = '';
		this.summaryAmount = '';
		this.summaryMinutes = '';
		this.clearErrors();

		// 手动清空 QR 码 DOM 内容
		const qrEl = document.querySelector('#payment_qr');
		if (qrEl) qrEl.innerHTML = '';
	},
	reset() {
		this.topup_amount = '';
		this.topup_time = '';
		this.promo_code = '';
		this.promo_preview = null;
		promo_preview_clear(this);
		this.resetOutputs();
	}
})

var vueRunGame = PetiteVue.reactive({
	game_id: '',
	title: ''
})

var vueGameLicense = PetiteVue.reactive({
	account: '',
	password: ''
})

var vueLogin = PetiteVue.reactive({
	username: '',
	password: '',
	access_code: '',
	// 4-digit access code parts
	ac1: '',
	ac2: '',
	ac3: '',
	ac4: '',
	booking_password: '', // for booking password modal
	bookingPCName: '',
	bookingTimeRange: '',
	// 最近预定信息（登录页展示）
	recentBookingAt: '',
	recentBookingLeft: '',
	// 密码可见性切换状态
	showPassword: false,
	showAdminExitPassword: false,
	isKeyboardError: false,
	// "验证身份以继续"弹窗（wss status_pc_token 不匹配时）：密码复用上面的 password 字段，账号不需要用户
	// 输入，account 只读展示服务端回传的当前 PC 绑定会员账号
	verify_account: '',
	verify_message: '',
	verify_denied: false
});

// icafe_id=18875 是演示网吧，登录页自动填充演示账号密码，方便销售/演示时免输入登录
var DEMO_ICAFE_ID = 7789;
function applyDemoLoginCredentials() {
	if (typeof theCafe !== 'undefined' && theCafe && Number(theCafe.id) === DEMO_ICAFE_ID) {
		vueLogin.username = 'demo';
		vueLogin.password = 'demo';
	}
}

var vueRegister = PetiteVue.reactive({
	account: '',
	birthday: '',
	password: '',
	confirm_password: '',
	first_name: '',
	last_name: '',
	phone: '',
	email: '',
	id_card: '',
	sex: '',
	sexMenuOpen: false,
	promo_code: '',
	promo_preview: null, // promo code 的预览结果，见 helper.js promo_preview_apply
	member_sms_code: '',
	code: '', // sms code input
	agree_club_rules: false,
	agree_personal_data: false,
	// 新会员套餐的扫码支付相关字段。必须在这里预先声明：PetiteVue 的 reactive 对象
	// 后加的键不是响应式的，注册表单顶部那条订单号横幅的绑定就不会更新。
	// 注意这里没有 payment_qr/payment_html 那一组——扫码界面走的是 swal（login.js 的
	// show_offer_payment_swal），节点由 build_payment_qr_element() 现场生成，不经过 vue。
	// UI 相位。配了新会员套餐时是 qr -> form，没配就一直停在 form。
	//   qr    出码等付款
	//   form  付款已到账，填注册资料（顶部显示订单号）
	//   stuck 轮询超时/订单被取消，让顾客拿订单号找店员
	phase: 'form',
	// 这张待认领订单的单号与凭据。凭据是服务端下单时一次性给的，提交注册表单时要带回去。
	claim_order_no: '',
	claim_token: '',
	claim_message: '',
	offer_name: '',
	offer_amount: '',
	poll_timer: null,
	// 验证错误消息
	errors: {
		account: '',
		password: '',
		confirm_password: ''
	},
	// 提交状态
	isSubmitting: false,
	// 清除所有错误
	clearErrors() {
		this.errors.account = '';
		this.errors.password = '';
		this.errors.confirm_password = '';
	},
	// 清掉支付相关的输出，回到初始相位。用户已填的资料保留。
	resetOutputs() {
		// 轮询必须停掉：顾客关掉弹窗再打开时，上一轮的轮询还活着的话会拿**上一张单**的状态
		// 去改新界面——上一张单刚好被新单的 prev_order_no 作废掉，于是新出的二维码会在 5 秒内
		// 被判成"已取消"。
		// poll_topup_status 返回的是取消函数，不是计时器 id，**不能**用 clearTimeout。
		if (typeof this.poll_timer === 'function') {
			this.poll_timer();
		}
		this.poll_timer = null;
		this.phase = 'form';
		this.claim_order_no = '';
		this.claim_token = '';
		this.claim_message = '';
		this.offer_name = '';
		this.offer_amount = '';
		this.clearErrors();
		// 二维码那几个节点在 swal 里，swal 关掉时整个 DOM 就没了，这里不用清
	}
});

var vueTopupLogin = PetiteVue.reactive({
	member_email: '', // topup_memeber_email
	topup_amount: '', // topup_login_amount
	promo_code: '',
	promo_preview: null, // promo code 的预览结果，见 helper.js promo_preview_apply
	payment_qr: '',
	payment_url: '',
	payment_type_img: false, // kaspi 需要在二维码下方额外显示自家 logo
	btn_group: true,
	topup_order_no: '',
	payment_html: '', // 图片类网关（razorpay/manual/paymongo/midtrans/finik）的展示 HTML，由 build_payment_view 生成
	topup_time: '',
	// UI 状态
	showFormRows: true,
	showSummary: false,
	showPaymentQr: false,
	openPresetMenu: '',
	// Summary 显示内容
	summaryMember: '',
	summaryAmount: '',
	summaryMinutes: '',
	// 验证错误消息
	errors: {
		member_email: '',
		topup_amount: '',
		topup_time: '',
		promo_code: ''
	},
	// 清除所有错误
	clearErrors() {
		this.errors.member_email = '';
		this.errors.topup_amount = '';
		this.errors.topup_time = '';
		this.errors.promo_code = '';
	},
	// Clear output state (QR, payment info, errors) but keep user inputs
	resetOutputs() {
		this.payment_qr = '';
		this.btn_group = true;
		this.payment_type_img = false;
		this.topup_order_no = '';
		this.payment_html = '';
		this.paymentData = null; // 重置支付数据，确保新二维码能正确显示

		this.showPaymentQr = false;
		this.showFormRows = true;
		this.showSummary = false;
		this.openPresetMenu = '';
		this.summaryMember = '';
		this.summaryAmount = '';
		this.summaryMinutes = '';
		this.clearErrors();

		// Manually clear QR code DOM if needed
		const qrEl = document.querySelector('.myModalTopupLogin #login_payment_qr');
		if (qrEl) qrEl.innerHTML = '';
	},
	// Reset inputs and outputs
	reset() {
		this.member_email = '';
		this.topup_amount = '';
		this.topup_time = '';
		this.promo_code = '';
		this.promo_preview = null;
		promo_preview_clear(this);
		this.openPresetMenu = '';
		this.resetOutputs();
	}
});

var vueForgotPassword = PetiteVue.reactive({
	phone_number: '',
	email: '',
});

var vueAdminExit = PetiteVue.reactive({
	password: '',
	hasError: false
});

// Layout forms state
var vueLayout = PetiteVue.reactive({
	// Lock form
	lockPassword: '',
	unlockPassword: '',
	// Feedback form
	feedbackSubject: '',
	feedbackMessage: '',
	// Change password form
	oldPassword: '',
	newPassword: '',
	confirmPassword: '',
	// Convert member form
	convertAccount: '',
	convertBirthday: '',
	convertPassword: '',
	convertConfirmPassword: '',
	convertFirstName: '',
	convertLastName: '',
	convertPhone: '',
	convertEmail: '',
	convertIdCard: '',
	convertSmsCode: '',
	convertPromoCode: '',
	convertClubRuleChecked: false,
	convertPersonalDataChecked: false,
	// Order search
	_orderSearch: '', // internal storage
	get orderSearch() {
		return this._orderSearch;
	},
	set orderSearch(val) {
		this._orderSearch = val;
		theMember.order_search_post();
	}
});

// 命名区分 core/shared/bootstrap.js 的 bootstrap()：那是"判断分支A/B、拉主题、注入DOM"的开机
// 引导阶段；这里是引导完成、主题内容已经注入之后，真正做应用状态初始化（petite-vue挂载、
// vueGlobal全局状态）的阶段，跟"引导"不是一回事，不叫 main() 以免和 bootstrap() 都像入口函数。
function initApp()
{
	// theSettings 默认值补全要排在最前面：initRankItems() 依赖它已经补好
	// theSettings.game_rank_options_*
	applySettingsDefaults();
	initRankItems();
	registerResizeHandlers();
	registerInputActivityHandlers();

	// listen.js 的 WSS 消息处理器 / 原生命令处理器要在下面 wssStart() 建立连接之前注册好，
	// 否则连接刚建立就到达的早期消息会因为还没人订阅而被丢弃
	theListen.registerWssHandlers();
	theListen.registerExeCommandHandlers();

	applyDemoLoginCredentials();

	// "网吧没在 CP 里选过主题色"要能跟"选了 Default 预设"区分开：clientapi.php 生成 icafe.js 时
	// 是先用 Helper::DEFAULT_CONFIGS 打底再拿 DB 覆盖，所以 client_themes_front_color 永远存在，
	// 没配置过的网吧拿到的也是系统默认 #49d149。若无条件下发内联变量，各主题 CSS 里声明的
	// :root 默认值就永远轮不到生效（内联 style 优先级最高），blue 这种自带整套配色的主题会被
	// 系统默认色顶掉——存量网吧一升级就变色。
	// 因此这里判定"用户确实做过选择"才下发：主题色类型不是 default，或颜色已被改成非默认值。
	// 对 icafemenu 无影响——它的 :root 默认值（core/css/theme-tokens.css）跟 Default 预设
	// 本来就是同一组 #49d149 / #111111，下不下发结果一样。
	// 前提：主题必须自带这几个变量的 :root 默认值，否则"没选过"时 var() 取不到值会导致
	// 整条声明失效（背景变透明）。我们自己的两个主题都在 main.htm 里引了 theme-tokens.css，
	// client_theme=custom 的网吧主题是从它们拷出来改的，同样带着这层默认值；
	// 新增主题时别漏掉这个 link，也别把 blue 那种自带配色的 :root 块删掉。
	var themesType = theSettings.client_themes_type || 'default';
	var themesPicked = themesType != 'default'
		|| String(theSettings.client_themes_front_color || '').toLowerCase() != '#49d149'
		|| String(theSettings.client_themes_back_color || '').toLowerCase() != '#111111';

	if(typeof(theSettings.client_themes_front_color) != 'undefined' && themesPicked)
	{
		document.documentElement.style.setProperty('--client_themes_front_color', theSettings.client_themes_front_color);
		document.documentElement.style.setProperty('--client_themes_front_color_90', theSettings.client_themes_front_color + 'e6');
		document.documentElement.style.setProperty('--client_themes_front_color_75', theSettings.client_themes_front_color + 'c0');
		// 主题色的 r,g,b 三元组 + 提亮档，必须在这里算好再交给 CSS。
		// 客户端 CEF 不支持 color-mix() 和 oklch(from ...) 相对颜色语法，而一旦表达式里带了
		// var() 又整体非法，整条声明会"invalid at computed-value time"退回属性初始值——
		// background-color 直接变成 transparent（按钮 hover 时整块没了），不是退回上一条规则，
		// 所以任意透明度和"hover 提亮"都不能在 CSS 里现算。
		// 注意 core/css/style.css 里闪电边框的 --electric-light-color 用的就是 oklch(from ...)，
		// 那段大概率一直是静默失效的，属于另一个待查问题，不要拿它当"CEF 支持新语法"的证据。
		// _rgb 供 rgba(var(--client_themes_front_color_rgb), 0.14) 这类任意 alpha 使用；
		// hover 变深复用已有的 _90（0.9 不透明度叠在深色底上就是压暗），不再单开变量。
		var frontHex = String(theSettings.client_themes_front_color || '').replace('#', '');
		if (frontHex.length == 3) frontHex = frontHex.charAt(0) + frontHex.charAt(0) + frontHex.charAt(1) + frontHex.charAt(1) + frontHex.charAt(2) + frontHex.charAt(2);
		if (/^[0-9a-fA-F]{6}$/.test(frontHex))
		{
			var frontR = parseInt(frontHex.substr(0, 2), 16);
			var frontG = parseInt(frontHex.substr(2, 2), 16);
			var frontB = parseInt(frontHex.substr(4, 2), 16);
			// 等比放大各通道可保持色相与饱和关系，比混白更接近原设计里"更亮但同样鲜艳"的 hover 色
			var lighten = function(v) { return Math.min(255, Math.round(v * 1.15)); };
			document.documentElement.style.setProperty('--client_themes_front_color_rgb', frontR + ', ' + frontG + ', ' + frontB);
			document.documentElement.style.setProperty('--client_themes_front_color_light', 'rgb(' + lighten(frontR) + ', ' + lighten(frontG) + ', ' + lighten(frontB) + ')');
		}
		document.documentElement.style.setProperty('--client_themes_back_color', theSettings.client_themes_back_color);
		document.documentElement.style.setProperty('--client_themes_back_color_90', theSettings.client_themes_back_color + 'e6');
		document.documentElement.style.setProperty('--client_themes_back_color_75', theSettings.client_themes_back_color + 'c0');
	}
	
	// setting the required prop for each required field
	if(typeof(theSettings.member_settings) != 'undefined')
	{
		vueGlobal.memberSettings = JSON.parse(theSettings.member_settings);
	}

	vueGlobal.currentTime = localTime();
	setInterval(function() {
		// 时钟是计时器，省电模式下也照走（见 helper.js 省电模式说明里的例外）
		vueGlobal.currentTime = localTime();
	}, 1000);

	// 新会员套餐扫码支付的标记全部由 core 注入，主题的 login.htm 不写任何相关内容。
	// 必须排在下面 mount('body') 之前：petite-vue 只在 mount 那一刻编译一次 DOM，
	// 之后再 append 进去的节点永远不会被编译，v-show / {{}} 都是死的。
	theMemberRegister.install_new_member_offer_ui();
	// Allow admin login = No 时隐藏主题登录页的 Admin 入口（不影响热键），同样必须在 mount 之前
	theLogin.install_admin_login_switch();

	PetiteVue.createApp({
		vueGlobal,
		vueLoginMode,
		vueScanLogin,
		vuePcTime,
		vueTopup,
		vueRunGame,
		vueGameLicense,
		vueLogin,
		vueRegister,
		vueTopupLogin,
		vueForgotPassword,
		vueAdminExit,
		vueLayout,
		get theSettings() { return theSettings }, // Use getter to ensure it picks up latest if changed, though it's likely static.
		// theNewMemberOffer 由 icafe.js 定义。老版本 iCafeCloud Server 下发的 icafe.js 里还没有这个
		// 变量，而模板里直接引用未声明的标识符会抛 ReferenceError 把整个 vue 应用打断，所以兜个底。
		get theNewMemberOffer() { return window.theNewMemberOffer ?? {} },
		mounted() {

			theSettings.allow_topup_at_client ??= 0;
			ui_init(true)
			$('[data-toggle="tooltip"]').tooltip();
		}
	}).mount('body')

	// debug for tooltip
	//$('body').tooltip({selector: "[data-toggle='tooltip']", trigger: "click"});

	theIsHomeVersion = ((theSettings.enable_icafesports ?? 0) == 1);
	vueGlobal.isHomeVersion = theIsHomeVersion;

	if (theIsHomeVersion) {
		if (typeof(theCafe) == 'undefined' || typeof(theSettings) == 'undefined') {
			vueGlobal.isHomeCafeId = true;
			vueGlobal.currentView = 'login';
			return;
		}
	}

	try
	{
		ICAFEMENU_CORE.sendCommandToExe('applocker');
		run_protect(theSettings.protection_settings ?? null);
		ICAFEMENU_CORE.sendCommandToExe("NOOP");
		if(location.pathname.indexOf('/demo/') >= 0){
			throw new Error("DEMO");
		}
	}
	catch(e)
	{
		// for dev debug in chrome（本来靠这里裸调用 CallFunction 抛错触发；现在 try 块里全部走 sendCommandToExe()，
		// 原生桥接缺失时 sendCommandToExe 自己会跳过、不再抛错，这个 catch 分支正常情况下不会再被触发）
		CallFunction = function(cmd)
		{
		}

		theLogin.show_login_page('login');

		thePCStatus = {'member_account': 'test', 'member_group_id': 9,'member_balance_realtime': 888, member_balance_bonus_realtime: 777, offer_in_using: '',
			member_coin_balance: 666, member_loan: 555, 'member_group_name': 'testGroup', 'available_offers': [{product_name: 'testOffer', product_seconds: 1000, 
			member_offer_left_seconds: 1000,member_offer_id: 1}], 'member_balance_bonus_left_seconds': 1000, 'member_points': 201, 'member_oauth_platform': 'account'};
		// test for booking
		/*thePCStatus = {'member_account': '', 'member_group_id': 9,'member_balance_realtime': 888, member_balance_bonus_realtime: 777, recent_booking: '2026-03-19 02:09', offer_in_using: '',
			member_coin_balance: 666, member_loan: 555, 'member_group_name': 'testGroup', 'available_offers': [{product_name: 'testOffer', product_seconds: 1000, 
			member_offer_left_seconds: 1000,member_offer_id: 1}], 'member_balance_bonus_left_seconds': 1000, 'member_points': 201, 'member_oauth_platform': 'account'};
		*/
		memberInfo.member_info_name = (thePCStatus.member_account || '').toUpperCase() + " / " + (thePCStatus.member_group_name || '').toUpperCase();
		memberInfo.member_name = (thePCStatus.member_account || '').toUpperCase();
		memberInfo.member_photo = '#5.png';
		memberInfo.price_per_hour = formatBigNumber(1000);
		thePCInfo.pc_name = window.__PC_NAME_OVERRIDE__ || 'Test';
		
		vuePcTime.dynamic = [{"time":"30","amount":"8.5"},{"time":"60","amount":"3.4"},{"time":"120","amount":"1.275"},{"time":"600","amount":"0.085"}];
		vuePcTime.price_dynamic_enable = 0;
		vuePcTime.fixed_price = 10;
		// debug 可以在这里设置显示不同页面
		theHome.show();
		//theStartSession.show();
		
		// This should be reactive via memberInfo.member_photo binding
		// $('.cafe_info_member_logo').attr('src', ICAFEMENU_CORE.icons_path('mg-'+(thePCStatus.member_group_id > MEMBER_GROUP_DEFAULT ? thePCStatus.member_group_id.toString() : '0') + '.png'));
		
		theAvailableOffers = [];
		var id = 1;
		for (var i=0; i<thePCStatus.available_offers.length; i++)
		{
			var in_using = (thePCStatus.available_offers[i].product_name == thePCStatus.offer_in_using && i == 0);
			// 当前使用中的 offer 倒计时应显示到下一个更高优先级 offer 启用前的剩余秒数，而非 offer 总剩余时长
			var offer_left_secs = in_using ? thePCStatus.status_connect_time_left : thePCStatus.available_offers[i].member_offer_left_seconds;
			theAvailableOffers.push({
				id: id++,
				in_using: in_using,
				time_type: 'offer',
				name: (thePCStatus.available_offers[i].product_name || '').toUpperCase(),
				total_secs: thePCStatus.available_offers[i].product_seconds,
				left_secs: offer_left_secs,
				last_notify_mins: 1000,
				active: '',
				member_offer_id: thePCStatus.available_offers[i].member_offer_id,
				product_is_promoted: thePCStatus.available_offers[i].product_is_promoted || 0
			});
		}

		if (thePCStatus.member_balance_bonus_left_seconds > 0)
		{
			var in_using = (thePCStatus.offer_in_using == null || thePCStatus.offer_in_using.length == 0);
			var name = translate_string('BALANCE');
			var left_secs = in_using ? thePCStatus.status_connect_time_left : thePCStatus.member_balance_bonus_left_seconds;

			theAvailableOffers.push({
				id: id++,
				in_using: in_using,
				time_type: 'balance',
				name: name,
				total_secs: thePCStatus.member_balance_bonus_left_seconds,
				left_secs: left_secs,
				last_notify_mins: 1000,
				active: ''
			});
		}

		// add total，从原始数据重新计算，避免 in_using offer 被截断后影响总计
		if (theAvailableOffers.length > 0)
		{
			var total_secs = 0;
			var left_secs = 0;
			for (var i = 0; i < thePCStatus.available_offers.length; i++) {
				total_secs += thePCStatus.available_offers[i].product_seconds;
				left_secs += thePCStatus.available_offers[i].member_offer_left_seconds;
			}
			if (thePCStatus.member_balance_bonus_left_seconds > 0) {
				total_secs += thePCStatus.member_balance_bonus_left_seconds;
				left_secs += (thePCStatus.offer_in_using == null || thePCStatus.offer_in_using.length == 0)
					? thePCStatus.status_connect_time_left
					: thePCStatus.member_balance_bonus_left_seconds;
			}

			theAvailableOffers.splice(0, 0, {
				id: id++,
				in_using: false,
				time_type: 'total',
				// 用 getter 而不是在这里算好存字符串：这一行可能在语言包加载完之前就生成了，
				// 存死的话会一直显示英文 TOTAL。getter 每次读都现翻——每秒的倒计时会
				// JSON 拷贝一遍（helper.js 的 vueAvailableOffers.items = JSON.parse(...)），
				// 语言包到了、切了语言，下一秒就跟着变
				get name() { return translate_string('TOTAL'); },
				total_secs: total_secs,
				left_secs: left_secs,
				last_notify_mins: 1000,
				active: ''
			});
		}

		if (theAvailableOffers.length > 0)
		{
			theAvailableOffers[0].in_using = true;
			theAvailableOffers[0].active = 'active';
		}

		vueAvailableOffers.items = JSON.parse(JSON.stringify(theAvailableOffers));
		// 计算并同步 remaining 和 percent 字段到 vueAvailableOffers.items
		for (var j = 0; j < vueAvailableOffers.items.length; j++) {
			vueAvailableOffers.items[j].remaining = format_time(vueAvailableOffers.items[j].left_secs);
			if (vueAvailableOffers.items[j].total_secs > 0) {
				vueAvailableOffers.items[j].percent = Math.min(Math.max(parseInt((vueAvailableOffers.items[j].left_secs / vueAvailableOffers.items[j].total_secs) * 100.0), 0), 100);
			} else {
				vueAvailableOffers.items[j].percent = 0;
			}
		}
		
		$('#carousel_main').carousel({ interval: false });

		// 这些显示控制已通过 vueGlobal.memberGroupId 在模板中绑定
		vueGlobal.memberGroupId = thePCStatus.member_group_id;

		if (theSettings.license_using_billing == 1 && thePCStatus.member_group_id != MEMBER_GROUP_POSTPAID && thePCStatus.member_group_id != MEMBER_GROUP_FREE) {
			memberInfo.member_balance_realtime = formatBigNumber(thePCStatus.member_balance_realtime);
			memberInfo.member_balance_bonus_realtime = formatBigNumber(thePCStatus.member_balance_bonus_realtime);

			memberInfo.member_coin_balance = formatBigNumber(thePCStatus.member_coin_balance);
			memberInfo.member_loan_raw = thePCStatus.member_loan;
			memberInfo.member_loan = formatBigNumber(thePCStatus.member_loan);
		}
		memberInfo.pc_cost_raw = 100;
		memberInfo.pc_cost = 100;
		
		vueHome.leaderboardItems = JSON.parse(JSON.stringify(
			{
				"last_month": [{
					"track_member_id": 4342284,
					"track_member_account": "aliitawi",
					"track_game_coins": "5723",
					"track_wins": "57",
					"rank": 1,
					"previous_rank": 1
				}, {
					"track_member_id": 312065975726,
					"track_member_account": "hael",
					"track_game_coins": "4516.6",
					"track_wins": "38",
					"rank": 2,
					"previous_rank": 2
				}, {
					"track_member_id": 4342324,
					"track_member_account": "ramitaiba",
					"track_game_coins": "1118",
					"track_wins": "13",
					"rank": 3,
					"previous_rank": 5
				}, {
					"track_member_id": 312067632456,
					"track_member_account": "nabil558",
					"track_game_coins": "1093",
					"track_wins": "1",
					"rank": 4,
					"previous_rank": 0
				}, {
					"track_member_id": 3408164,
					"track_member_account": "karimkayal",
					"track_game_coins": "821",
					"track_wins": "11",
					"rank": 5,
					"previous_rank": 3
				}, {
					"track_member_id": 3063546152,
					"track_member_account": "hoblos",
					"track_game_coins": "648.5",
					"track_wins": "8",
					"rank": 6,
					"previous_rank": 0
				}],
				"current_month": [{
					"track_member_id": 312065975726,
					"track_member_account": "haelxxxxxxxxxxxxxxxxxxxx",
					"track_game_coins": "530",
					"track_wins": "4",
					"rank": 1,
					"previous_rank": 2
				}, {
					"track_member_id": 312067632966,
					"track_member_account": "ME",
					"track_game_coins": "132.5",
					"track_wins": "1",
					"rank": 2,
					"previous_rank": 0
				}, {
					"track_member_id": 312066792082,
					"track_member_account": "najib1",
					"track_game_coins": "88.5",
					"track_wins": "1",
					"rank": 3,
					"previous_rank": 0
				}, {
					"track_member_id": 312067632968,
					"track_member_account": "os88",
					"track_game_coins": "80.5",
					"track_wins": "1",
					"rank": 4,
					"previous_rank": 0
				}, {
					"track_member_id": 5154524,
					"track_member_account": "rakana",
					"track_game_coins": "54",
					"track_wins": "1",
					"rank": 5,
					"previous_rank": 0
				}, {
					"track_member_id": 312061500211,
					"track_member_account": "fouad1234",
					"track_game_coins": "42.5",
					"track_wins": "0",
					"rank": 6,
					"previous_rank": 0
				}]
			}
		));
		
		// promoted products
		theShop.change_group(PRODUCT_GROUP_PROMOTED);
		
		//event-list
		theEvents.events = 
			[{
				"event_id": "d94eddf1-765c-11ed-aaf5-f23c93e24cac",
				"event_icafe_id": 18875,
				"event_name": "AAA",
				"event_description": "How to join?\r\nClick the join icon, enter your email address and Telegram username, and then click the Join button. In the pop-up browser, follow the prompts to join our Telegram group (name: iCafeCloud Events). If you have already joined, you can skip this step.\r\n\r\nWhy do I have to join the Telegram group?\r\nYou may encounter the following question: Why don\u2019t I have points when I play the game? How are points calculated? What is the daily ranking change? What's new event? When does it begin? How to collect bonus? Can I organize a competition by myself? You can talk to us directly in the Telegram group.\r\n\r\nWhich games does this Event support?\r\nFortnite\r\nLeague of Legends\r\nDota 2\r\nValorant\r\nAfter you join, you can play any game during the one-month competition period. Each game of yours will be counted as points. The more you play, the higher the points, and there are no restrictions.\r\n\r\nHow to calculate points?\r\nFortnite\u2019s integral calculation formula is:\r\nKills x 3\r\nTop 1 = +9 points\r\n\r\nThe formula for calculating League of Legends points is:\r\nWins x 3\r\nKills x 2\r\nAssists x 1.5\r\nDeaths x -0.5\r\nLOL mode x 1.5\r\nTFT mode x 1.25\r\nKills from 11 to 999 = +2 points\r\nAssists from 11 to 9999 = +2 points\r\n\r\nDota2\u2019s integral calculation formula is:\r\nKills x 2\r\nAssists x 1.5\r\nDeaths x -0.5\r\nLastHits x 0.01\r\nKills from 11 to 999 = +10 points\r\nAssists from 11 to 999 = +10 points\r\n\r\nValorant's integral calculation formula is:\r\nAssists x 0.5\r\nKills x 2\r\nWin = +20 points\r\n\r\nBecause each game has a different difficulty in obtaining points, for the sake of fairness, according to big data analysis, the points of each game should be multiplied by the weight value to calculate the total score, specifically: Fornite weight value is 1, League of Legends is 0.06 , Dota2 is 0.065, Valorant is 0.177.\r\n\r\nHow to win the game?\r\nPlay as many games as possible. We don't have any restrictions. The more you play, the higher the points. In order to increase your participation, we take the top 50 as the winners and all can get bonuses.\r\n\r\nHow to get bonus?\r\nFor convenience, our bonus pool is the data currency DOGE. Please abide by the laws and regulations of your country. If it is not allowed, please do not join our competition. After the competition is over, we will distribute bonuses based on the points of the top 50 players. We will notify the winners one by one in the Telegram group and communicate the payment of funds.\r\n\r\nHave fun and Good luck !!\r\n\r\nJoin our gaming community at telegram\r\nhttps:\/\/www.icafecloud.com\/telegram\/",
				"event_game_code": "dota2",
				"event_game_mode": "",
				"event_start_time_utc": "2022-12-06 16:00:00",
				"event_end_time_utc": "2025-09-08 04:00:00",
				"event_score_type": "all",
				"event_top_winners": 3,
				"event_top_matches": 1000,
				"event_bonus_amount": "200.00",
				"event_bonus_currency": "DOGE",
				"event_ticket_price": "0.00",
				"event_is_global": 0,
				"event_update_time": "2023-05-02 20:30:47",
				"event_start_time_local": "2022-12-07 00:00:00",
				"event_end_time_local": "2025-09-08 12:00:00",
				"event_in_banner": 1,
				"event_play_command": "{steam-path}\\steam.exe -silent -noverifyfiles -applaunch 570",
				"emember_id": "05ba2bf1-765d-11ed-aaf5-f23c93e24cac",
				"emember_event_id": "d94eddf1-765c-11ed-aaf5-f23c93e24cac",
				"emember_icafe_id": 18875,
				"emember_member_account": "test",
				"emember_email": "",
				"emember_matches": 0,
				"emember_point_matches": 0,
				"emember_point": 0,
				"emember_wins": 0,
				"emember_kills": 0,
				"emember_assists": 0,
				"emember_deaths": 0,
				"emember_lasthits": 0,
				"emember_game_track_id": 0,
				"emember_ticket_amount": "0.00",
				"emember_bonus": "0.00",
				"emember_bonus_coin_address": "",
				"emember_bonus_pay_status": 0,
				"emember_bonus_trade_id": "",
				"emember_create_time_utc": "2022-12-07 18:29:01",
				"emember_rank_score": 0,
				"emember_status": 1,
				"emember_telegram_username": "",
				"emember_rank": 1,
				"emember_count": 2
			},{
				"event_id": "d94eddf1-765c-11ed-aaf5-f23c93e24cad",
				"event_icafe_id": 18875,
				"event_name": "CCC",
				"event_description": "How to join?\r\nClick the join icon, enter your email address and Telegram username, and then click the Join button. In the pop-up browser, follow the prompts to join our Telegram group (name: iCafeCloud Events). If you have already joined, you can skip this step.\r\n\r\nWhy do I have to join the Telegram group?\r\nYou may encounter the following question: Why don\u2019t I have points when I play the game? How are points calculated? What is the daily ranking change? What's new event? When does it begin? How to collect bonus? Can I organize a competition by myself? You can talk to us directly in the Telegram group.\r\n\r\nWhich games does this Event support?\r\nFortnite\r\nLeague of Legends\r\nDota 2\r\nValorant\r\nAfter you join, you can play any game during the one-month competition period. Each game of yours will be counted as points. The more you play, the higher the points, and there are no restrictions.\r\n\r\nHow to calculate points?\r\nFortnite\u2019s integral calculation formula is:\r\nKills x 3\r\nTop 1 = +9 points\r\n\r\nThe formula for calculating League of Legends points is:\r\nWins x 3\r\nKills x 2\r\nAssists x 1.5\r\nDeaths x -0.5\r\nLOL mode x 1.5\r\nTFT mode x 1.25\r\nKills from 11 to 999 = +2 points\r\nAssists from 11 to 9999 = +2 points\r\n\r\nDota2\u2019s integral calculation formula is:\r\nKills x 2\r\nAssists x 1.5\r\nDeaths x -0.5\r\nLastHits x 0.01\r\nKills from 11 to 999 = +10 points\r\nAssists from 11 to 999 = +10 points\r\n\r\nValorant's integral calculation formula is:\r\nAssists x 0.5\r\nKills x 2\r\nWin = +20 points\r\n\r\nBecause each game has a different difficulty in obtaining points, for the sake of fairness, according to big data analysis, the points of each game should be multiplied by the weight value to calculate the total score, specifically: Fornite weight value is 1, League of Legends is 0.06 , Dota2 is 0.065, Valorant is 0.177.\r\n\r\nHow to win the game?\r\nPlay as many games as possible. We don't have any restrictions. The more you play, the higher the points. In order to increase your participation, we take the top 50 as the winners and all can get bonuses.\r\n\r\nHow to get bonus?\r\nFor convenience, our bonus pool is the data currency DOGE. Please abide by the laws and regulations of your country. If it is not allowed, please do not join our competition. After the competition is over, we will distribute bonuses based on the points of the top 50 players. We will notify the winners one by one in the Telegram group and communicate the payment of funds.\r\n\r\nHave fun and Good luck !!\r\n\r\nJoin our gaming community at telegram\r\nhttps:\/\/www.icafecloud.com\/telegram\/",
				"event_game_code": "dota2",
				"event_game_mode": "",
				"event_start_time_utc": "2022-12-06 16:00:00",
				"event_end_time_utc": "2022-12-08 04:00:00",
				
				"event_ticket_price": "0.00",
				"event_is_global": 0,
				"event_update_time": "2023-05-02 20:30:47",
				"event_start_time_local": "2022-12-07 00:00:00",
				"event_end_time_local": "2022-12-08 12:00:00",
				"event_in_banner": 1,
				"event_play_command": "{steam-path}\\steam.exe -silent -noverifyfiles -applaunch 570",
				"emember_id": "05ba2bf1-765d-11ed-aaf5-f23c93e24cad",
				"emember_event_id": "d94eddf1-765c-11ed-aaf5-f23c93e24cad",
				"emember_icafe_id": 18875,
				"emember_member_account": "test",
				"emember_email": "",
				"emember_matches": 0,
				"emember_point_matches": 0,
				"emember_point": 0,
				"emember_wins": 0,
				"emember_kills": 0,
				"emember_assists": 0,
				"emember_deaths": 0,
				"emember_lasthits": 0,
				"emember_game_track_id": 0,
				"emember_ticket_amount": "0.00",
				"emember_bonus": "0.00",
				"emember_bonus_coin_address": "",
				"emember_bonus_pay_status": 0,
				"emember_bonus_trade_id": "",
				"emember_create_time_utc": "2022-12-07 18:29:01",
				"emember_rank_score": 0,
				"emember_status": 1,
				"emember_telegram_username": "",
				"emember_rank": 1,
				"emember_count": 2
			}, {
				"event_id": "d94eddf1-765c-11ed-aaf5-f23c93e24caa",
				"event_icafe_id": 18875,
				"event_name": "BBB",
				"event_description": "How to join?\r\nClick the join icon, enter your email address and Telegram username, and then click the Join button. In the pop-up browser, follow the prompts to join our Telegram group (name: iCafeCloud Events). If you have already joined, you can skip this step.\r\n\r\nWhy do I have to join the Telegram group?\r\nYou may encounter the following question: Why don\u2019t I have points when I play the game? How are points calculated? What is the daily ranking change? What's new event? When does it begin? How to collect bonus? Can I organize a competition by myself? You can talk to us directly in the Telegram group.\r\n\r\nWhich games does this Event support?\r\nFortnite\r\nLeague of Legends\r\nDota 2\r\nValorant\r\nAfter you join, you can play any game during the one-month competition period. Each game of yours will be counted as points. The more you play, the higher the points, and there are no restrictions.\r\n\r\nHow to calculate points?\r\nFortnite\u2019s integral calculation formula is:\r\nKills x 3\r\nTop 1 = +9 points\r\n\r\nThe formula for calculating League of Legends points is:\r\nWins x 3\r\nKills x 2\r\nAssists x 1.5\r\nDeaths x -0.5\r\nLOL mode x 1.5\r\nTFT mode x 1.25\r\nKills from 11 to 999 = +2 points\r\nAssists from 11 to 9999 = +2 points\r\n\r\nDota2\u2019s integral calculation formula is:\r\nKills x 2\r\nAssists x 1.5\r\nDeaths x -0.5\r\nLastHits x 0.01\r\nKills from 11 to 999 = +10 points\r\nAssists from 11 to 999 = +10 points\r\n\r\nValorant's integral calculation formula is:\r\nAssists x 0.5\r\nKills x 2\r\nWin = +20 points\r\n\r\nBecause each game has a different difficulty in obtaining points, for the sake of fairness, according to big data analysis, the points of each game should be multiplied by the weight value to calculate the total score, specifically: Fornite weight value is 1, League of Legends is 0.06 , Dota2 is 0.065, Valorant is 0.177.\r\n\r\nHow to win the game?\r\nPlay as many games as possible. We don't have any restrictions. The more you play, the higher the points. In order to increase your participation, we take the top 50 as the winners and all can get bonuses.\r\n\r\nHow to get bonus?\r\nFor convenience, our bonus pool is the data currency DOGE. Please abide by the laws and regulations of your country. If it is not allowed, please do not join our competition. After the competition is over, we will distribute bonuses based on the points of the top 50 players. We will notify the winners one by one in the Telegram group and communicate the payment of funds.\r\n\r\nHave fun and Good luck !!\r\n\r\nJoin our gaming community at telegram\r\nhttps:\/\/www.icafecloud.com\/telegram\/",
				"event_game_code": "dota2",
				"event_game_mode": "",
				"event_start_time_utc": "2022-12-06 16:00:00",
				"event_end_time_utc": "2025-09-08 04:00:00",
				"event_score_type": "all",
				"event_top_winners": 3,
				"event_top_matches": 1000,
				"event_bonus_amount": "200.00",
				"event_bonus_currency": "DOGE",
				"event_ticket_price": "0.00",
				"event_is_global": 0,
				"event_update_time": "2023-05-02 20:30:47",
				"event_start_time_local": "2022-12-07 00:00:00",
				"event_end_time_local": "2025-09-08 12:00:00",
				"event_in_banner": 1,
				"event_play_command": "{steam-path}\\steam.exe -silent -noverifyfiles -applaunch 570",
				"event_status": 'active'
			}];
		theEvents.build_event_list_html();
		//event-detail
		var eventData = 
			{
				"event_id": "d94eddf1-765c-11ed-aaf5-f23c93e24cac",
				"event_icafe_id": 18875,
				"event_name": "AAA",
				"event_description": "How to join?\r\nClick the join icon, enter your email address and Telegram username, and then click the Join button. In the pop-up browser, follow the prompts to join our Telegram group (name: iCafeCloud Events). If you have already joined, you can skip this step.\r\n\r\nWhy do I have to join the Telegram group?\r\nYou may encounter the following question: Why don\u2019t I have points when I play the game? How are points calculated? What is the daily ranking change? What's new event? When does it begin? How to collect bonus? Can I organize a competition by myself? You can talk to us directly in the Telegram group.\r\n\r\nWhich games does this Event support?\r\nFortnite\r\nLeague of Legends\r\nDota 2\r\nValorant\r\nAfter you join, you can play any game during the one-month competition period. Each game of yours will be counted as points. The more you play, the higher the points, and there are no restrictions.\r\n\r\nHow to calculate points?\r\nFortnite\u2019s integral calculation formula is:\r\nKills x 3\r\nTop 1 = +9 points\r\n\r\nThe formula for calculating League of Legends points is:\r\nWins x 3\r\nKills x 2\r\nAssists x 1.5\r\nDeaths x -0.5\r\nLOL mode x 1.5\r\nTFT mode x 1.25\r\nKills from 11 to 999 = +2 points\r\nAssists from 11 to 9999 = +2 points\r\n\r\nDota2\u2019s integral calculation formula is:\r\nKills x 2\r\nAssists x 1.5\r\nDeaths x -0.5\r\nLastHits x 0.01\r\nKills from 11 to 999 = +10 points\r\nAssists from 11 to 999 = +10 points\r\n\r\nValorant's integral calculation formula is:\r\nAssists x 0.5\r\nKills x 2\r\nWin = +20 points\r\n\r\nBecause each game has a different difficulty in obtaining points, for the sake of fairness, according to big data analysis, the points of each game should be multiplied by the weight value to calculate the total score, specifically: Fornite weight value is 1, League of Legends is 0.06 , Dota2 is 0.065, Valorant is 0.177.\r\n\r\nHow to win the game?\r\nPlay as many games as possible. We don't have any restrictions. The more you play, the higher the points. In order to increase your participation, we take the top 50 as the winners and all can get bonuses.\r\n\r\nHow to get bonus?\r\nFor convenience, our bonus pool is the data currency DOGE. Please abide by the laws and regulations of your country. If it is not allowed, please do not join our competition. After the competition is over, we will distribute bonuses based on the points of the top 50 players. We will notify the winners one by one in the Telegram group and communicate the payment of funds.\r\n\r\nHave fun and Good luck !!\r\n\r\nJoin our gaming community at telegram\r\nhttps:\/\/www.icafecloud.com\/telegram\/",
				"event_game_code": "dota2",
				"event_game_mode": "",
				"event_start_time_utc": "2022-12-06 16:00:00",
				"event_end_time_utc": "2025-09-08 04:00:00",
				"event_score_type": "all",
				"event_top_winners": 3,
				"event_top_matches": 1000,
				"event_bonus_amount": "200.00",
				"event_bonus_currency": "DOGE",
				"event_ticket_price": "0.00",
				"event_is_global": 0,
				"event_update_time": "2023-05-02 20:30:47",
				"event_start_time_local": "2022-12-07 00:00:00",
				"event_end_time_local": "2025-09-08 12:00:00",
				"event_in_banner": 1,
				"event_play_command": "{steam-path}\\steam.exe -silent -noverifyfiles -applaunch 570",
				"emember_id": "05ba2bf1-765d-11ed-aaf5-f23c93e24cac",
				"emember_event_id": "d94eddf1-765c-11ed-aaf5-f23c93e24cac",
				"emember_icafe_id": 18875,
				"emember_member_account": "test",
				"emember_email": "",
				"emember_matches": 0,
				"emember_point_matches": 0,
				"emember_point": 0,
				"emember_wins": 0,
				"emember_kills": 0,
				"emember_assists": 0,
				"emember_deaths": 0,
				"emember_lasthits": 0,
				"emember_game_track_id": 0,
				"emember_ticket_amount": "0.00",
				"emember_bonus": "0.00",
				"emember_bonus_coin_address": "",
				"emember_bonus_pay_status": 0,
				"emember_bonus_trade_id": "",
				"emember_create_time_utc": "2022-12-07 18:29:01",
				"emember_rank_score": 0,
				"emember_status": 1,
				"emember_telegram_username": "",
				"emember_rank": 1,
				"emember_count": 2,
				"members": [{
					"emember_id": "18c1ceba-d6e8-11ed-b1de-f23c93e24cac",
					"emember_event_id": "d94eddf1-765c-11ed-aaf5-f23c93e24cac",
					"emember_icafe_id": 18875,
					"emember_member_account": "bin",
					"emember_email": "",
					"emember_matches": 0,
					"emember_point_matches": 0,
					"emember_point": 0,
					"emember_wins": 0,
					"emember_kills": 0,
					"emember_assists": 0,
					"emember_deaths": 0,
					"emember_lasthits": 0,
					"emember_game_track_id": 0,
					"emember_ticket_amount": "0.00",
					"emember_bonus": "0.00",
					"emember_bonus_coin_address": "",
					"emember_bonus_pay_status": 0,
					"emember_bonus_trade_id": "",
					"emember_create_time_utc": "2023-04-09 15:06:25",
					"emember_rank_score": 0,
					"emember_status": 1,
					"emember_telegram_username": "",
					"emember_rank": 1
				}, {
					"emember_id": "05ba2bf1-765d-11ed-aaf5-f23c93e24cac",
					"emember_event_id": "d94eddf1-765c-11ed-aaf5-f23c93e24cac",
					"emember_icafe_id": 18875,
					"emember_member_account": "test",
					"emember_email": "",
					"emember_matches": 0,
					"emember_point_matches": 0,
					"emember_point": 0,
					"emember_wins": 0,
					"emember_kills": 0,
					"emember_assists": 0,
					"emember_deaths": 0,
					"emember_lasthits": 0,
					"emember_game_track_id": 0,
					"emember_ticket_amount": "0.00",
					"emember_bonus": "0.00",
					"emember_bonus_coin_address": "",
					"emember_bonus_pay_status": 0,
					"emember_bonus_trade_id": "",
					"emember_create_time_utc": "2022-12-07 18:29:01",
					"emember_rank_score": 0,
					"emember_status": 1,
					"emember_telegram_username": "",
					"emember_rank": 2
				}]
			};
		for (var i=0; i<theEvents.events.length; i++) {
			if (theEvents.events[i].event_id == eventData.event_id) {
				theEvents.events[i] = eventData;

				theEvents.events[i].event_status = 'active';
				if (moment(theEvents.events[i].event_end_time_local).isBefore())
					theEvents.events[i].event_status = 'past';
				if (moment(theEvents.events[i].event_start_time_local).isAfter())
					theEvents.events[i].event_status = 'upcoming';

				theEvents.gamecode2names.forEach(function(game) {
					if (theEvents.events[i].event_game_code == game.code) {
						theEvents.events[i].game_name = game.name;
					}
				});

				// If current member record need push to members end
				if (theEvents.events[i].members.length > 0 && theEvents.events[i].emember_id && theEvents.events[i].emember_rank > theEvents.events[i].members[theEvents.events[i].members.length-1].emember_rank) {
					theEvents.events[i].members.push({
						emember_id: theEvents.events[i].emember_id,
						emember_member_account: theEvents.events[i].emember_member_account,
						emember_rank: theEvents.events[i].emember_rank,
						emember_matches: theEvents.events[i].emember_matches,
						emember_point_matches: theEvents.events[i].emember_point_matches,
						emember_bonus: theEvents.events[i].emember_bonus,
						emember_point: theEvents.events[i].emember_point,
						emember_wins: theEvents.events[i].emember_wins,
						emember_kills: theEvents.events[i].emember_kills,
						emember_assists: theEvents.events[i].emember_assists,
						emember_deaths: theEvents.events[i].emember_deaths,
						emember_lasthits: theEvents.events[i].emember_lasthits,
						license_country: theEvents.events[i].license_country,
						license_icafename: theEvents.events[i].license_icafename
					});
				}
				break;
			}
		}

		theEvents.build_event_list_html();
		theEvents.build_event_detail_html(eventData.event_id);
		
		PetiteVue.nextTick(() => {
			ui_init();
			$('[data-toggle="tooltip"]').tooltip();
		});
		// test for booking
		// wss_client_status({'data': {'client_status': thePCStatus}});
		return;
	}

	// theLogin.show_login_page() 现在返回一个 Promise，登录背景图（非视频模式）预加载完才 resolve——initApp()
	// 在函数末尾把它 return 出去，core/shared/theme-bootstrap.js 里的 await initApp() 会等它，
	// 引导阶段的 loading 动画因此会一直盖到真实背景图下载完，不会先闪一下兜底图再被替换
	var loginBackgroundReady = theLogin.show_login_page('login');

	if (theIsHomeVersion) {
		unlock_all();
		ICAFEMENU_CORE.sendCommandToExe("SETWINDOWSIZE -2*-2");
		theLastWindowSize = "-2*-2";
	}

	ICAFEMENU_CORE.wssStart();


	// 分支 B：Overwolf 和打印机由 C++ 在 FetchGamecenterConfig() 拿到配置后无法直接调用（icafe.js 尚未解析），
	// 改由 JS 在 theSettings 已就绪后推送。window.theBootstrap 仅在分支 B 的 main.htm bootstrap 里赋值，
	// 分支 A 下为 undefined，以此区分，避免在分支 A 下重复触发（C++ 启动时已直接调用）
	if (window.theBootstrap) {
		if (theSettings.license_start_game_tracker) ICAFEMENU_CORE.sendCommandToExe('START_GAME_TRACKER');
		if (theSettings.allow_client_print)         ICAFEMENU_CORE.sendCommandToExe('INSTALL_PRINTER');
	}


	// 告诉原生"页面的 onExeCommand/onWss 监听器都注册完了"。原生的 WSS_LOGIN 推送是"发生就推、不重试"的，
	// 如果 wss 连接是从上次页面加载就已经登录着的（比如页面刷新但 exe 进程和 wss 连接本身没断），
	// 这次页面重新加载根本不会有新的登录事件触发那次推送，theWssLogined 会一直卡在初始值。
	// JS_READY 让原生主动查一次当前连接状态，已登录就把 WSS_LOGIN 重新推一次。client_status 等
	// 后续状态推送不用额外处理：正常情况下（连接是这次 wssStart() 才建立的）它们发生在监听器
	// 注册完毕之后，不存在竞态；即使命中连接复用的边界情况错过一次，PC 状态之后有任何变化都会
	// 触发服务端重新推送，界面会自然被下一次真实事件纠正，不需要在这里特殊处理
	ICAFEMENU_CORE.sendCommandToExe('JS_READY');

	return loginBackgroundReady;
}
// resize handling
const onWindowResize = debounce(()=> {
	vueGlobal.isDualMonitor = window.innerWidth > screen.width;
	vueGlobal.isDualMonitorHeight = window.innerHeight > screen.height;
});

// 原来是裸的顶层语句，改成命名函数、由 initApp() 显式调用
function registerResizeHandlers() {
	window.addEventListener('resize', onWindowResize);
	window.addEventListener('load', onWindowResize);
	window.ResizeObserver && (async ()=>(new ResizeObserver(() => onWindowResize())).observe(document.body))()
}

// 原来是裸的顶层语句，改成命名函数、由 initApp() 显式调用
function registerInputActivityHandlers() {
	$(document).keydown(function (event)
	{
		theMonitorTurnOffStartTime = new Date();

		if (event.altKey && (event.keyCode === 115 || event.key === 'F4')) {
			event.preventDefault();
			event.stopPropagation();
			ICAFEMENU_CORE.sendCommandToExe("EXIT");
			return;
		}

		if (!is_logined()) {
			var _hotkey = (theSettings.client_admin_hotkey || 'esc').toLowerCase();
			if (_hotkey !== 'none' && event.keyCode == 27) {
				var _ctrl  = _hotkey.includes('ctrl')  ? event.ctrlKey  : true;
				var _shift = _hotkey.includes('shift') ? event.shiftKey : true;
				if (_ctrl && _shift) theLogin.show_login_page('admin_exit');
			}
			return;
		}

		if (is_locked())
			return;

		// logined and not locking
		// X = 88, B = 66, F = 70, F1 = 112
		if (event.ctrlKey && event.keyCode == 112)
			send_assist();

		if (event.ctrlKey && event.keyCode == 70){
			theGame.show();
			$('input#search-bar').focus();
			setTimeout(() => $('input#search-bar').focus(), 10);
		}

		if (event.ctrlKey && event.keyCode == 88)
			checkout_click();

		if (event.ctrlKey && event.keyCode == 66)
			theShop.show();

		if (theSettings == null || typeof(theSettings.license_show_client_mode) == 'undefined' || theSettings.license_show_client_mode != 'full screen') {
			if (event.ctrlKey && event.keyCode == 'M'.charCodeAt(0))
				ICAFEMENU_CORE.sendCommandToExe('HIDEWINDOW');
		}
	});

	$(document).mousedown(function(event) {
		if (!is_logined())
			theMonitorTurnOffStartTime = new Date();
		return true;
	});
}

var SmsClassFun = new SmsClass();

var theConvertToMember = new ConvertToMember();

var theVideo = new Video();

var thePCInfo = theApiClient.pcInfo; // listen.js 是动态加载的所以收不到pcinfo消息

function set_monitor_turn_off_timeout(seconds)
{
	if (theMonitorTurnOffIntervalId != null) 
	{
		clearInterval(theMonitorTurnOffIntervalId);
		theMonitorTurnOffIntervalId = null;
	}

	if(seconds == 0)
		return;
	
	theMonitorTurnOffStartTime = new Date();
	theMonitorTurnOffIntervalId = setInterval(function() {

		if (new Date() - theMonitorTurnOffStartTime < seconds * 1000)
			return;

		theMonitorTurnOffStartTime = new Date();
		theMonitorTurnOffStartTime.setFullYear(2050,1,1);
		ICAFEMENU_CORE.sendCommandToExe("MONITOR OFF");

	}, 10000);
}

// rebuildData jQuery插件（jQuery.data()缓存重建）原来这里也有一份，全局零调用，是死代码，删掉。

var vueMemberAvatar = PetiteVue.reactive({
	selectedAvatar: '',
	uploadPreview: null,
	uploadFile: null,
	activeTab: 'gallery',
	memberAvatarApp: null,

	switchTab(tab) {
		this.activeTab = tab;
	},
	
	selectAvatar(path) {
		this.selectedAvatar = path;
		this.uploadPreview = null; // Clear upload if gallery selected
		this.uploadFile = null;
	},
	
	async handleAvatarUpload(event) {
		const file = event.target.files[0];
		if (file) {
			if (file.size > 10 * 1024 * 1024) {
				toast('File size too large. Max 10MB.');
				return;
			}
			
			vueGlobal.isLoading = true;
			
			try {
				const compressed = await this.compressAndConvertImage(file);
				
				if (compressed) {
					this.uploadPreview = compressed;
					this.uploadFile = file;
					this.selectedAvatar = ''; // Clear gallery selection
				}
			} catch (error) {
				console.error('Image compression error:', error);
			} finally {
				vueGlobal.isLoading = false;
			}
		}
	},
	
	clearUpload() {
		this.uploadPreview = null;
		this.uploadFile = null;
		const input = document.getElementById('avatarUploadInput');
		if (input) input.value = '';
	},
	
	async saveAvatar() {
		let member_photo = '';
		
		if (this.uploadPreview && this.uploadFile) {
			member_photo = await this.compressAndConvertImage(this.uploadFile);
			if (!member_photo) {
				toast('Failed to process avatar image.');
				return;
			}
			
			const sizeInKB = Math.round((member_photo.length * 3) / 4 / 1024);
			console.log('Final image size before upload:', sizeInKB, 'KB');
			
			if (sizeInKB > 80) {
				toast(`Image size (${sizeInKB}KB) exceeds 80KB limit. Upload cancelled.`);
				return;
			}
			
		} else if (this.selectedAvatar) {
			const filename = this.selectedAvatar.split('/').pop();
			member_photo = filename;
		} else {
			toast('Please select an avatar or upload one.');
			return;
		}
		
		vueGlobal.isLoading = true;
		try {
			const data = await theApiClient.callCafeApi('updateAvatar', 'POST', {
				member_photo: member_photo
			});
			
			if (data) {
				if (typeof memberInfo !== 'undefined') {
					memberInfo.member_photo = member_photo;
				}
				
				vueGlobal.modals.avatar = false;
				toast('Avatar updated successfully!');
			}
		} catch (error) {
			ICafeApiError.show(error);
		} finally {
			vueGlobal.isLoading = false;
		}
	},
	
	
	async compressAndConvertImage(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const img = new Image();
				img.onload = () => {
					const targetSizeKB = 80;
					let result = null;
					
					const sizeLevels = [200, 150, 120, 100, 80];
					
					for (const maxSize of sizeLevels) {
						const canvas = document.createElement('canvas');
						const ctx = canvas.getContext('2d');
						
						let width = img.width;
						let height = img.height;
						
						if (width > height) {
							if (width > maxSize) {
								height = (height * maxSize) / width;
								width = maxSize;
							}
						} else {
							if (height > maxSize) {
								width = (width * maxSize) / height;
								height = maxSize;
							}
						}
						
						canvas.width = width;
						canvas.height = height;
						
						ctx.drawImage(img, 0, 0, width, height);
						
						for (let quality = 0.9; quality >= 0.1; quality -= 0.1) {
							const tempResult = canvas.toDataURL('image/jpeg', quality);
							const sizeInKB = Math.round((tempResult.length * 3) / 4 / 1024);
							
							if (sizeInKB <= targetSizeKB) {
								result = tempResult;
								console.log(`Compressed to ${sizeInKB}KB at ${Math.round(width)}x${Math.round(height)} with quality ${Math.round(quality * 100)}%`);
								break;
							}
						}
						
						if (result) break;
					}
					
					if (!result) {
						const canvas = document.createElement('canvas');
						const ctx = canvas.getContext('2d');
						const minSize = 60;
						
						let width = img.width;
						let height = img.height;
						
						if (width > height) {
							if (width > minSize) {
								height = (height * minSize) / width;
								width = minSize;
							}
						} else {
							if (height > minSize) {
								width = (width * minSize) / height;
								height = minSize;
							}
						}
						
						canvas.width = width;
						canvas.height = height;
						ctx.drawImage(img, 0, 0, width, height);
						result = canvas.toDataURL('image/jpeg', 0.1);
						
						const finalSizeKB = Math.round((result.length * 3) / 4 / 1024);
						console.log(`Final attempt: ${finalSizeKB}KB at ${Math.round(width)}x${Math.round(height)}`);
					}
					
					const actualSizeKB = Math.round((result.length * 3) / 4 / 1024);
					if (actualSizeKB > targetSizeKB) {
						toast(`Cannot compress image below 80KB (current: ${actualSizeKB}KB). Please choose a different image.`);
						resolve(null);
					} else {
						// 更新预览
						this.uploadPreview = result;
						resolve(result);
					}
				};
				
				img.onerror = () => {
					reject(new Error('Failed to load image'));
				};
				
				img.src = e.target.result;
			};
			
			reader.onerror = (error) => {
				reject(error);
			};
			
			reader.readAsDataURL(file);
		});
	},
	
	async show_member_avatar_modal() {
		if (theSettings.allow_member_upload_photo != 1) {
			return;
		}
		
		const memberData = window.memberInfo;
		
		if (!memberData) {
			toast('Failed to load member information');
			return;
		}
		
		// Reset state
		vueMemberAvatar.selectedAvatar = '';
		vueMemberAvatar.uploadPreview = null;
		vueMemberAvatar.uploadFile = null;
		vueMemberAvatar.activeTab = 'gallery';
		const input = document.getElementById('avatarUploadInput');
		if (input) input.value = '';
		
		if (memberData.member_photo) {
			if (memberData.member_photo.startsWith('#')) {
				vueMemberAvatar.selectedAvatar = memberData.member_photo;
			} else if (memberData.member_photo.startsWith('data:')) {
				vueMemberAvatar.uploadPreview = memberData.member_photo;
			}
		}
		
		// Mount if not already mounted
		if (!this.memberAvatarApp) {
			const el = document.querySelector('.myModalMemberAvatar');
			if (el) {
				 this.memberAvatarApp = PetiteVue.createApp(vueMemberAvatar).mount('.myModalMemberAvatar');
			}
		}
		
		// Show modal
		vueGlobal.modals.avatar = true;
	},
	
	getAvatarUrl(photo) {
		var defaultAvatar = (typeof(theSettings) != 'undefined' && theSettings.cafe_info_member_logo) ? theSettings.cafe_info_member_logo : 'images/default-avatar.png';
		if (!photo) return defaultAvatar;
		if (photo.startsWith('#')) {
			var x =  ICAFEMENU_CORE.core_path('faces/' + photo.substring(1));
			return x;
		}
		if (photo.startsWith('data:')) {
			return photo;
		}
		return defaultAvatar;
	}
});

