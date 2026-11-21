function Home()
{
	this.show = function(refreshBanance = false) {

		vueGlobal.pageType = "Home";
		vueGlobal.showBottom = true;
		
		theGame.clear_game_info();
		
		// 首页与锁屏页共用同一套游戏背景渲染逻辑，统一维护图片/视频切换。
		apply_game_background_visual();

		vueGlobal.currentView = 'layout';
		vueGlobal.bodyClass = 'bd-game-page';

		// Top 5 Games - 有收藏显示收藏，没有收藏显示热门
		var topFiveGames = [];
		
		// 确保 member_favorite_games 已初始化（从 thePCStatus.member_recent_played 加载）
		if (typeof(thePCStatus.member_recent_played) != 'undefined' && thePCStatus.member_recent_played != null) {
			try {
				theGame.member_favorite_games = JSON.parse(thePCStatus.member_recent_played);
			} catch(e) {
				theGame.member_favorite_games = [];
			}
		}
		
		// 如果有收藏，只显示收藏的游戏（有几个显示几个，最多5个）
		if (theGame.member_favorite_games && theGame.member_favorite_games.length > 0) {
			theGame.member_favorite_games.forEach(fav => {
				var game = theGames.find(g => g.pkg_id == fav.pkg_id);
				if (game && game.pkg_name.toLowerCase() !== 'icafemenu' && game.pkg_name.toLowerCase() !== 'overwolf') {
					topFiveGames.push(game);
				}
			});
		} else {
			// 没有收藏时，显示热门游戏
			theGames.sort(theGame.local_hot_compare).forEach(game => {
				if (game.pkg_name.toLowerCase() === 'icafemenu' || game.pkg_name.toLowerCase() === 'overwolf') return;
				topFiveGames.push(game);
			});
		}
		topFiveGames = topFiveGames.slice(0, 5);
		vueGames.topFiveItems = JSON.parse(JSON.stringify(topFiveGames));

		// Promoted product
		theShop.change_group(PRODUCT_GROUP_PROMOTED);
		setDropdownMenu();

		if (is_member_logined())
			vueGlobal.menuButton.changepassword = true;

		// 用户积分
		if((thePCStatus.member_points ?? null) && (theSettings.point_enable ?? 0)) {
			theMemberGroup = theMemberGroup.filter(obj => obj.member_group_id > 0 && obj.member_group_point_min !== undefined)
			.sort((a, b) => parseFloat(a.member_group_point_min) - parseFloat(b.member_group_point_min));

			var memberGroup = [];
			var groupIndex = 1;
			var memberCurrentGroup = 0;
			var memberCurrentGroupPoint = 0;
			theMemberGroup.forEach(function(group) {

				let point_min = parseFloat(group.member_group_point_min);

				if(thePCStatus.member_group_id == group.member_group_id) {
					memberCurrentGroup = groupIndex;
					memberCurrentGroupPoint = (groupIndex == theMemberGroup.length ? point_min : theMemberGroup[groupIndex].member_group_point_min);
				}

				memberGroup.push(
					{
						mebmer_group_index: groupIndex,
						member_group_id: group.member_group_id,
						member_group_name: group.member_group_name,
						member_group_point_min: point_min,
					}
				);

				groupIndex++;
			});
			
			if(memberGroup.length > 0)
			{
				var lastGroupIndex = memberGroup[memberGroup.length - 1].mebmer_group_index;
				var showMemberGroup = [];
				if(memberCurrentGroup == 1 || memberCurrentGroup == 0) {
					showMemberGroup = memberGroup.slice(0, 3);
				} else if(lastGroupIndex == memberCurrentGroup) {
					let startIndex = memberGroup.length > 3 ? memberGroup.length - 3 : 0;
					showMemberGroup = memberGroup.slice(startIndex, memberGroup.length);
				} else {
					showMemberGroup = memberGroup.slice(memberCurrentGroup - 2, memberCurrentGroup + 1);
				}

				if(memberCurrentGroup == 0 && showMemberGroup.length > 0) {
					memberCurrentGroupPoint = showMemberGroup[0].member_group_point_min;
				}

				vueHome.memberCurrentGroup = memberCurrentGroup; 
				
				vueHome.memberGroup = JSON.parse(JSON.stringify(showMemberGroup));
				vueHome.memberCurrentGroupName = vueHome.memberGroup.findIndex(g=>g.mebmer_group_index == memberCurrentGroup)?.member_group_name
				vueHome.memberPointValue = thePCStatus.member_points + '/' + memberCurrentGroupPoint;
				let idx = vueHome.memberGroup.findIndex(g=>g.mebmer_group_index == memberCurrentGroup)
				if(idx > 0){
					vueHome.nextGroup =vueHome.memberGroup[idx+1]
				}
			}
		}

		PetiteVue.nextTick(() => {
			ui_init();
			$('[data-toggle="tooltip"]').tooltip();
			//that.load_games_by_class('class', 'Favorite', '');
		});
		
		if (typeof(theCafeNews) != 'undefined' && theCafeNews != null && theCafeNews.length > 0) {
			//$('#news_carousel_main .carousel-inner').html(tmpl('tmpl-news', { items: theCafeNews } ));
			//translate_obj($('#news_carousel_main .carousel-inner'));
			for(var i = 0; i < theCafeNews.length; i ++)
			{
				theCafeNews[i].active = '';
			}
			if(theCafeNews.length > 0)
				theCafeNews[0].active = 'active';
			vueCafeNews.items = JSON.parse(JSON.stringify(theCafeNews)).map((item) => {
				item.news_show_qr = typeof(item.news_show_qr) == 'undefined' ? true : item.news_show_qr;
				item.news_video = typeof(item.news_video) == 'undefined' ? '' : item.news_video;
				item.isYoutube = false;
				item.news_duration = typeof(item.news_duration) == 'undefined' ? 5000 : item.news_duration;
				item.news_type = typeof(item.news_type) == 'undefined' ? 'picture' : item.news_type;
				var youtubeId = youtube_video_id(item.news_video);
				if (youtubeId) {
					item.isYoutube = true;
					item.news_video = youtube_embed_url(youtubeId);
				}
				else if (item.news_video.match(/youtube/) === null)
					item.news_video = ICAFEMENU_CORE.videos_path(item.news_video);
				
				if(item.news_type === 'picture') {
					item.news_video = ''
				}

				return item;
			});
			
			PetiteVue.nextTick(() => {
				var t;
				function scheduleNextSlide() {
					var duration = parseInt($('#home_carousel_news .carousel-inner').find('.active').attr('data-bs-interval')) || 5000;
					clearTimeout(t);
					t = setTimeout(function() {
						// 省电模式（玩家在游戏里）同样只重新排期不翻页：每翻一页就是一次
						// carousel-fade 的大面积重绘，软件渲染下这笔开销要从游戏帧率里扣
						if (thePowerSave.active || !$('#home_carousel_news').is(':visible')) {
							scheduleNextSlide();
							return;
						}
						$('#home_carousel_news').carousel('pause');
						$('#home_carousel_news').carousel('next');
					}, duration);
				}
				scheduleNextSlide();
				$('#home_carousel_news').off('slid.bs.carousel').on('slid.bs.carousel', function () {
					$('#home_carousel_news').carousel('pause');
					scheduleNextSlide();
				});

				$('#home_carousel_news .carousel-indicators').off('click.news').on('click.news', function(){
					$('#home_carousel_news').carousel('pause');
					clearTimeout(t);
					scheduleNextSlide();
				});
				ui_init();
				$('[data-toggle="tooltip"]').tooltip();

				this.initNewsCarousel();
			});

			//$('#home_carousel_news').carousel({ interval: 1000 });
		}
		// 刷新余额
		if (refreshBanance) {
			refreshBalanceInfo(memberInfo.member_name);
		}
		theGame.show(); //不显示首页了
	}

	this.open_news = function(id) {
		theCafeNews.forEach(function(obj) {
			if (obj.news_id == id) {
				ICAFEMENU_CORE.sendCommandToExe('OPENURL ' + obj.news_url);
				console.log('open news ' + obj.news_url);
			}
		});
	}

	this.handleQRClick = function(id) {
		vueCafeNews.items = vueCafeNews.items.map((item) => {
			if (item.news_id === id) {
				item.news_show_qr = false;
			}
			return item;
		});
	}

	// 判断 offer 在当前时间段是否可用（综合周次 / 时间段 / 有效期）。
	// 数据源：thePCStatus.available_offers，由 memberAvailableOffers 端点填充，含 is_available_now 字段。
	// 供 start-session.htm 和 member-sidebar.htm 使用。
	this.isOfferAvailableNow = function(member_offer_id) {
		if (typeof thePCStatus === 'undefined' || !Array.isArray(thePCStatus.available_offers)) {
			return true; // 数据未就绪时默认可用，避免误置灰
		}
		for (var i = 0; i < thePCStatus.available_offers.length; i++) {
			var ao = thePCStatus.available_offers[i];
			if (ao && ao.member_offer_id == member_offer_id) {
				return ao.is_available_now !== false; // 显式 false 才置灰，缺字段默认可用
			}
		}
		return true; // 列表中找不到时默认可用
	}

	this.switchShopTab = function(tab) {
		// 使用Vue状态控制Tab激活和内容显示
		vueHome.currentShopTab = tab;

		// 加载对应数据
		if (tab === 'promoted') {
			if (typeof theShop !== 'undefined' && typeof theShop.change_group === 'function') {
				theShop.change_group(PRODUCT_GROUP_PROMOTED);
			}
		} else if (tab === 'offers') {
			if (typeof theShop !== 'undefined' && typeof theShop.change_group === 'function') {
				theShop.change_group(PRODUCT_GROUP_OFFERS);
			}
		}

		if (typeof vueHome !== 'undefined') {
			vueHome.promotedActive = 0;
			vueHome.offersActivePage = 0;
		}
	}

	this.updateShopItems = function() {
		if (typeof vueHome !== 'undefined' && vueHome.$forceUpdate) vueHome.$forceUpdate();
	}

	// promoted 商品分页指示器统一入口：模板只调这一个方法，不直接改 vueHome.promotedActive
	this.selectPromotedPage = function(pageIndex) {
		vueHome.promotedActive = pageIndex;
		this.updateShopItems();
	}

	this.prevShopPage = function() {
		if (typeof vueHome === 'undefined' || !vueHome.promotedGoods || vueHome.promotedGoods.length <= 1) return;
		var pageSize = 3;
		var total = Math.ceil(vueHome.promotedGoods.length / pageSize);
		if (total <= 1) return;
		vueHome.promotedActive = (vueHome.promotedActive - 1 + total) % total;
	}

	this.nextShopPage = function() {
		if (typeof vueHome === 'undefined' || !vueHome.promotedGoods || vueHome.promotedGoods.length <= 1) return;
		var pageSize = 3;
		var total = Math.ceil(vueHome.promotedGoods.length / pageSize);
		if (total <= 1) return;
		vueHome.promotedActive = (vueHome.promotedActive + 1) % total;
	}

	this.prevOffersPage = function() {
		if (typeof vueHome === 'undefined') return;
		if (typeof vueProducts === 'undefined' || !vueProducts.items) return;
		var totalPages = Math.ceil(vueProducts.items.length / 3);
		if (totalPages <= 1) return;
		vueHome.offersActivePage = ((vueHome.offersActivePage || 0) - 1 + totalPages) % totalPages;
	}

	this.nextOffersPage = function() {
		if (typeof vueHome === 'undefined') return;
		if (typeof vueProducts === 'undefined' || !vueProducts.items) return;
		var totalPages = Math.ceil(vueProducts.items.length / 3);
		if (totalPages <= 1) return;
		vueHome.offersActivePage = ((vueHome.offersActivePage || 0) + 1) % totalPages;
	}

	this.switchRankNewsTab = function(tab) {
		// 使用Vue状态控制Tab激活和内容显示
		vueHome.currentRankNewsTab = tab;
	}

	this._setNewsActivePage = function(index) {
		if (typeof vueCafeNews === 'undefined' || !vueCafeNews.items) return;
		var current = vueHome.newsActivePage || 0;
		if (vueCafeNews.items[current]) vueCafeNews.items[current].active = '';
		if (vueCafeNews.items[index]) vueCafeNews.items[index].active = 'active';
		vueHome.newsActivePage = index;
	}

	this.prevNewsPage = function() {
		if (typeof vueCafeNews === 'undefined' || !vueCafeNews.items || vueCafeNews.items.length <= 1) return;
		this._setNewsActivePage((vueHome.newsActivePage - 1 + vueCafeNews.items.length) % vueCafeNews.items.length);
	}

	this.nextNewsPage = function() {
		if (typeof vueCafeNews === 'undefined' || !vueCafeNews.items || vueCafeNews.items.length <= 1) return;
		this._setNewsActivePage((vueHome.newsActivePage + 1) % vueCafeNews.items.length);
	}

	this.goToNewsPage = function(index) {
		this._setNewsActivePage(index);
	}

	this._newsCarouselTimer = null;

	this.initNewsCarousel = function() {
		var that = this;
		if ($('#game_carousel_news').length === 0) return;
		function scheduleNextNewsSlide() {
			if (typeof vueCafeNews === 'undefined' || !vueCafeNews.items || vueCafeNews.items.length <= 1) return;
			var currentIdx = (typeof vueHome !== 'undefined') ? (vueHome.newsActivePage || 0) : 0;
			var duration = parseInt((vueCafeNews.items[currentIdx] || {}).news_duration) || 5000;
			clearTimeout(that._newsCarouselTimer);
			that._newsCarouselTimer = setTimeout(function() {
				if (typeof vueCafeNews === 'undefined' || !vueCafeNews.items) return;
				// 省电模式下不翻页，只重新排期（理由同 home_carousel_news 那处）
				if (thePowerSave.active) {
					scheduleNextNewsSlide();
					return;
				}
				var total = vueCafeNews.items.length;
				var currentNow = (typeof vueHome !== 'undefined') ? (vueHome.newsActivePage || 0) : 0;
				that._setNewsActivePage((currentNow + 1) % total);
				scheduleNextNewsSlide();
			}, duration);
		}
		scheduleNextNewsSlide();
	}
}

// @deprecated 向后兼容用，不要在新代码里调用，请直接用 theHome.xxx()。
// 以下函数原先是主题 .htm 里 @click 直接调用的裸函数名，仓库内的模板已经改成
// theHome.xxx()，但主题文件可能存在版本库之外的自定义副本（各网吧/代理商私下改过的 .htm），
// 这些副本升级 core/js 时不会同步改动，仍会按旧的裸函数名调用，所以保留这层薄包裹委托给
// theHome 的同名方法。_setNewsActivePage/initNewsCarousel 只在 home.js 内部使用，不受影响。
function open_news(id) { theHome.open_news(id); } // @deprecated 用 theHome.open_news()
function handleQRClick(id) { theHome.handleQRClick(id); } // @deprecated 用 theHome.handleQRClick()
function isOfferAvailableNow(member_offer_id) { return theHome.isOfferAvailableNow(member_offer_id); } // @deprecated 用 theHome.isOfferAvailableNow()
function switchShopTab(tab) { theHome.switchShopTab(tab); } // @deprecated 用 theHome.switchShopTab()
function updateShopItems() { theHome.updateShopItems(); } // @deprecated 用 theHome.updateShopItems()
function prevShopPage() { theHome.prevShopPage(); } // @deprecated 用 theHome.prevShopPage()
function nextShopPage() { theHome.nextShopPage(); } // @deprecated 用 theHome.nextShopPage()
function prevOffersPage() { theHome.prevOffersPage(); } // @deprecated 用 theHome.prevOffersPage()
function nextOffersPage() { theHome.nextOffersPage(); } // @deprecated 用 theHome.nextOffersPage()
function switchRankNewsTab(tab) { theHome.switchRankNewsTab(tab); } // @deprecated 用 theHome.switchRankNewsTab()
function prevNewsPage() { theHome.prevNewsPage(); } // @deprecated 用 theHome.prevNewsPage()
function nextNewsPage() { theHome.nextNewsPage(); } // @deprecated 用 theHome.nextNewsPage()
function goToNewsPage(index) { theHome.goToNewsPage(index); } // @deprecated 用 theHome.goToNewsPage()

// Lucky Spin 每日转盘抽奖
// 配置来自 theSettings.lucky_spin_enable / theSettings.lucky_spin_config(由 icafe.js 下发)
// 抽奖为同步请求-响应: 调 POST spinWheel/spin 拿到 prize_index, 转盘转到该格后展示结果并刷新余额
// 跟其它 core/js 构造函数一样用 function+this 写法，但实例化时额外用 PetiteVue.reactive() 包一层
// （见 main.js 的 theSpinWheel = PetiteVue.reactive(new SpinWheel())）——这个对象的属性
// （spinning/showRecords/segments/wheelStyle 等）会被模板直接拿去做响应式绑定，普通对象改属性
// 不会触发视图更新，必须保留 reactive() 包装。
function SpinWheel()
{
	this.spinning = false;
	this.showRecords = false;
	this.rotation = 0;
	this.segments = [];   // [{label, labelStyle}]
	this.wheelStyle = {};
	this.records = [];
	this.recordsPaging = { page: 1, pages: 1, page_start: 1, page_end: 1 };
	this.canSpin = false;     // 是否还能抽(供入口/auto_pop); 缺省不允许, 真正查到 checkStatus() 结果才放行
	this.minTopup = 0;        // 单笔充值达到多少可赚一次抽奖机会(0=本网吧没开充值赚取), 由 checkStatus 从后端带回
	this.reason = '';         // 不能抽的原因(ok/disabled/weekday/need_topup/no_quota), 由后端按拒绝顺序判定
	this.remaining = 0;       // 剩余可抽次数(白给剩余 + 充值赚的余额), 显示在入口按钮的徽章上
	this.stock = [];          // 各奖格剩余份数, 与 prizes 下标对齐, null=不限量; 只认 status/spin 接口返回的,
	                          // icafe.js 里 lucky_spin_config 的 stock 是缓存(抽奖扣库存不刷新 icafe.js), 不能用
	this.eligible = false;    // 当前会员组是否在允许参与的分组内(控制入口显示)
	this._autoPopped = false; // 本次会话是否已自动弹过(防重复弹)

	// 转盘配置(prizes 数组)
	this.config = function() {
		return (typeof theSettings !== 'undefined' && theSettings.lucky_spin_config) ? theSettings.lucky_spin_config : {};
	}
	this.prizes = function() {
		return this.config().prizes || [];
	}

	this.open = function() {
		this.showRecords = false;
		this.buildSegments();
		vueGlobal.modals.spinWheel = true;
		this.syncSpinUi(); // 先按手上的数据刷一次, 等 checkStatus 回来再刷新一次
		// 每次弹窗都刷新一次 can_spin/remaining, 不阻塞弹窗本身(不 await), 避免展示登录时留下的过期状态
		// (比如挂着不重新登录跨过了配额重置点, 或者 auto_pop 判断和实际弹出之间隔了 2.5s)
		this.checkStatus();
	}

	// 根据 prizes 生成转盘扇区(conic-gradient 背景 + 标签沿半径定位)
	this.buildSegments = function() {
		var prizes = this.prizes();
		var n = prizes.length;
		this.segments = [];
		if (n === 0) { this.wheelStyle = {}; return; }
		var seg = 360 / n;
		var colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#5f27cd', '#ff9ff3', '#54a0ff', '#00d2d3'];
		var gradientParts = [];
		for (var i = 0; i < n; i++) {
			// 限量奖格在名称下面换行显示剩余份数, 抽完的格子灰掉; 数字写在格子上, 转动时跟着一起转
			// 换行靠 labelStyle 的 white-space:pre-line(行内样式压过主题里的 white-space:normal), 不改主题 html
			var left = (this.stock[i] !== undefined && this.stock[i] !== null) ? Math.max(0, Number(this.stock[i]) || 0) : null;
			var color = (left === 0) ? '#5a5f6b' : colors[i % colors.length];
			var start = i * seg, end = (i + 1) * seg;
			gradientParts.push(color + ' ' + start + 'deg ' + end + 'deg');
			var center = start + seg / 2;
			this.segments.push({
				label: this.prizeLabel(prizes[i]) + (left === null ? '' : '\n\u00d7' + left),
				// 旋转到该格中心, 沿半径外移, 文字转回正, 最后 translate(-50%,-50%) 让文字块在该点居中(避免长名称横向溢出到相邻扇区)
				labelStyle: {
					transform: 'rotate(' + center + 'deg) translateY(-112px) rotate(' + (-center) + 'deg) translate(-50%, -50%)',
					whiteSpace: 'pre-line'
				}
			});
		}
		this.wheelStyle = {
			background: 'conic-gradient(' + gradientParts.join(',') + ')',
			transform: 'rotate(' + this.rotation + 'deg)'
		};
	}

	// 转盘格子上显示的简短文字
	this.prizeLabel = function(p) {
		if (!p) return '';
		if (p.type === 'bonus') return translate_string('Bonus') + ' ' + (p.value || 0);
		if (p.type === 'offer') return p.name || ((p.mins || 0) + 'm');
		// 之前用的是 "Try again"，俄语翻译成"Повторить"（"重来一次"的意思），会员会误以为
		// 转到这一格代表"可以再抽一次"，实际上这一格就是没中奖。改成语义更明确的 "No prize"，
		// 避免这种误导（跟未配置奖品时的兜底提示用同一个词，含义一致）。
		return translate_string('No prize');
	}

	this.spin = async function() {
		if (this.spinning) return;
		var prizes = this.prizes();
		var n = prizes.length;
		if (n === 0) return;
		this.spinning = true;

		var res = null, errMsg = '';
		try {
			res = await theApiClient.callCafeApi('spinWheel/spin', 'POST', {
				pc_name: (typeof thePCInfo !== 'undefined' && thePCInfo.pc_name) ? thePCInfo.pc_name : ''
			});
		} catch (e) {
			errMsg = (e && e.message) ? e.message : '';
		}

		var isReal = res && typeof res.prize_index !== 'undefined';
		// 仅本地开发(localhost)在后端不可用时降级为随机转动预览; 生产环境严格按后端结果, 失败则提示不转(避免误导)
		var isDemo = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
		if (!isReal && !isDemo) {
			this.spinning = false;
			sweetAlert({ title: '', text: errMsg || translate_string('Unable to spin right now, please try again later'), type: 'warning' });
			return;
		}

		var index = isReal ? res.prize_index : Math.floor(Math.random() * n);

		// 计算目标角度: 让命中格中心停到顶部指针处, 多转 5 圈
		var seg = 360 / n;
		var targetMod = (360 - (index * seg + seg / 2)) % 360;
		var current = ((this.rotation % 360) + 360) % 360;
		var need = (targetMod - current + 360) % 360;
		this.rotation += 5 * 360 + need;
		this.wheelStyle = Object.assign({}, this.wheelStyle, {
			transform: 'rotate(' + this.rotation + 'deg)',
			transition: 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
		});

		var that = this;
		setTimeout(function () {
			that.spinning = false;
			if (isReal) {
				// 转盘停下才刷新格子上的剩余份数: 一点 SPIN 就减, 会员在转盘停之前就能看出中了哪格
				if (Array.isArray(res.stock)) {
					that.stock = res.stock;
					that.buildSegments();
				}
				that.showResult(res.prize);
				that.checkStatus();
				// 通过客户端自身 WSS 连接请求服务端重新下发 client_status, 刷新余额/offer 列表
				// 比 push_clientstatus (跨进程 Channel 广播) 更直接可靠
				if (typeof ICAFEMENU_CORE !== 'undefined') {
					ICAFEMENU_CORE.wsssend('request_status', 'request', 'wss-server', {});
				}
			} else {
				sweetAlert({ title: '', text: translate_string('Spin preview - connect server to win real rewards'), type: 'info' });
			}
		}, 4200);
	}

	// 查询今日抽奖状态(can_spin/remaining/auto_pop); 传 pcName 时后端顺带触发 client_status 推送
	this.checkStatus = async function(pcName = '') {
		var url = 'spinWheel/status' + (pcName ? '?pc_name=' + encodeURIComponent(pcName) : '');
		var res = await theApiClient.callCafeApi(url, 'GET').catch(function () { return null; });
		if (res) {
			this.canSpin = (res.can_spin == 1);
			this.minTopup = Number(res.min_topup) || 0;
			this.reason = res.reason || '';
			this.remaining = Math.max(0, Number(res.remaining) || 0);
			this.stock = Array.isArray(res.stock) ? res.stock : [];
			// 转动中不重建扇区: buildSegments 会把 transform 重置成不带过渡的样式, 动画会直接跳到终点;
			// 停下后 spin() 自己会按接口返回的 stock 再刷一次
			if (!this.spinning) this.buildSegments();
			this.syncSpinUi();
		}
		return res;
	}

	// ── 徽章与提示行: 全部由 JS 注入, 不改主题 html ──────────────────────────────
	// 主题 html 归客户定制, 这里只能靠现有结构认锚点, 代价是绑死了当前 DOM:
	// 换掉礼物图标、改掉 "Lucky Spin"/"SPIN" 文案, 这两处都会静默失效(不报错)
	//
	// 认锚点靠 .lang 元素的英文原文: translate_node() 翻译后会把原文写进 data-lang-key,
	// 英文界面不翻译也就没有该属性, 此时 textContent 本身就是原文 —— 两者取其一即可
	// 传多个 key 时依次尝试: icafemenu 的 SPIN / No spins left 两个 span 用的是 v-if,
	// 同一时刻只有一个在 DOM 里 —— 只认 'SPIN' 的话, canSpin=false(最需要提示的时候)反而找不到锚点
	// SPIN 按钮的三种文字: 能抽 / 次数用完 / 非抽奖日(由 syncSpinButtonText 改写)。锚点查找必须三个都认 ——
	// 英文界面没有 data-lang-key, 按钮被改写后只剩 textContent 可比; icafemenu 的 v-if 又让 SPIN 那个 span 不在 DOM
	var SPIN_BTN_KEYS = ['SPIN', 'No spins left', 'Not available today', 'All prizes have been won'];

	this._btnByLangKey = function(keys) {
		if (!Array.isArray(keys)) keys = [keys];
		var list = document.querySelectorAll('span.lang');
		for (var k = 0; k < keys.length; k++) {
			for (var i = 0; i < list.length; i++) {
				var el = list[i];
				if (((el.dataset.langKey || el.textContent || '').trim()) === keys[k]) {
					var btn = el.closest('button');
					if (btn) return btn;
				}
			}
		}
		return null;
	}

	// 入口按钮上的剩余次数徽章
	// 只在"现在真能抽"时显示, 不是"库存有多少"就显示: 限定星期的网吧里, 会员平时攒下的
	// 次数在非抽奖日依然存在(credit 不过期), 若照数字显示, 入口写着 1 、点进去按钮却是
	// 灰的, 看起来就像坏了。按钮文案 "No spins left" 由主题 html 写死、只看 canSpin 不看
	// 原因, 这里跟着 canSpin 走才能和它保持一致
	// 0 次时同样整个隐藏 —— 显示一个 0 是负面暗示, 会削弱点击欲, 点开后本来就有充值引导
	this.syncEntryBadge = function() {
		var btn = this._btnByLangKey('Lucky Spin');
		if (!btn) return;
		var badge = btn.querySelector('.spin-remaining-badge');
		if (!badge) {
			badge = document.createElement('span');
			badge.className = 'spin-remaining-badge ml-2';
			// 两个主题按钮底色不同(blue 浅底深字, icafemenu 深底), 用半透明白底 + 继承色兼顾
			badge.style.cssText = 'min-width:18px;height:18px;padding:0 5px;border-radius:9px;'
				+ 'background:rgba(255,255,255,0.92);color:#1d9f57;font-size:11px;font-weight:700;'
				+ 'line-height:18px;text-align:center;';
			btn.appendChild(badge);
		}
		badge.textContent = this.remaining;
		badge.style.display = (this.remaining > 0 && this.canSpin) ? '' : 'none';
	}

	// 转盘弹窗里 SPIN 按钮下方的引导行
	this.syncSpinHint = function() {
		var btn = this._btnByLangKey(SPIN_BTN_KEYS);
		if (!btn || !btn.parentNode) return;
		var line = btn.parentNode.querySelector('.spin-hint-line');
		if (!line) {
			line = document.createElement('div');
			line.className = 'spin-hint-line mt-2 text-white-50 small';
			btn.parentNode.insertBefore(line, btn.nextSibling);
		}
		var text = this.spinHint();
		line.textContent = text;
		line.style.display = text ? '' : 'none';
	}

	// 两处一起刷新; DOM 可能还没注入(member-sidebar 是 fetch 进来的), 找不到锚点就静默跳过,
	// 下次调用再补上 —— 所以不需要 MutationObserver 之类的等待机制
	this.syncSpinUi = function() {
		this.syncEntryBadge();
		this.syncSpinHint();
		this.syncSpinRules();
		// 按钮文字要等 petite-vue 把 v-show/v-if 刷完再改: icafemenu 那两个 span 用 v-if,
		// canSpin 变化后元素会被重建, 同步改会被紧接着的重渲染冲掉。vue 在微任务里刷新, setTimeout 排在它后面
		var that = this;
		setTimeout(function() { that.syncSpinButtonText(); }, 0);
	}

	// 转盘弹窗里的规则说明, 跟 CP 设置页的摘要用同一套句子: 会员能看到什么时候能抽、怎么获得次数
	// 数据取 icafe.js 下发的 theSettings.lucky_spin_config, 不额外请求接口
	this.spinRulesLines = function() {
		var cfg = this.config(), lines = [];
		var names = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
		var wd = (cfg.allowed_weekdays || []).map(Number).filter(function(d) { return d >= 1 && d <= 7; }).sort();
		lines.push(translate_string('Spin days') + ': '
			+ (wd.length ? wd.map(function(d) { return translate_string(names[d]); }).join(', ') : translate_string('Every day')));
		var free = parseInt(cfg.daily_times) || 0;
		if (free > 0) {
			var key = (cfg.period === 'week') ? 'Free spins: {0} per member per week' : 'Free spins: {0} per member per day';
			lines.push(translate_string(key).replace('{0}', free));
		}
		var minTopup = parseFloat(cfg.min_topup) || 0;
		if (minTopup > 0) {
			var cur = (typeof theSettings !== 'undefined' && theSettings.currency) ? theSettings.currency + ' ' : '';
			lines.push(translate_string('Topup spins: {1} for each topup of {0} or more, never expire')
				.replace('{0}', cur + minTopup).replace('{1}', Math.max(1, parseInt(cfg.spins_per_topup) || 1)));
		}
		return lines;
	}

	this.syncSpinRules = function() {
		var btn = this._btnByLangKey(SPIN_BTN_KEYS);
		if (!btn || !btn.parentNode) return;
		var box = btn.parentNode.querySelector('.spin-rules-block');
		if (!box) {
			box = document.createElement('div');
			box.className = 'spin-rules-block mt-3 small text-white-50';
			var hint = btn.parentNode.querySelector('.spin-hint-line');
			var after = hint || btn;
			btn.parentNode.insertBefore(box, after.nextSibling);
		}
		box.innerHTML = '';
		this.spinRulesLines().forEach(function(t) {
			var d = document.createElement('div');
			d.textContent = t;
			box.appendChild(d);
		});
	}

	// 按钮文字由主题 html 写死, v-show/v-if 只看 canSpin: 次数用完和今天不是抽奖日都显示
	// "No spins left"。后一种会员其实攒着次数, 这句是错的 —— 在不改主题 html 的前提下由 JS 覆盖
	this.syncSpinButtonText = function() {
		var btn = this._btnByLangKey(SPIN_BTN_KEYS);
		if (!btn) return;
		var spans = btn.querySelectorAll('span.lang');
		for (var i = 0; i < spans.length; i++) {
			var el = spans[i];
			var key = el.dataset.spinOrigKey || (el.dataset.langKey || el.textContent || '').trim();
			if (key !== 'No spins left') continue;
			el.dataset.spinOrigKey = key;   // 记住原始 key, 改过文字后还能认出它、也能改回去
			el.textContent = translate_string(this.reason === 'weekday' ? 'Not available today'
				: (this.reason === 'pool_empty' ? 'All prizes have been won' : 'No spins left'));
		}
	}

	// 不能抽时的引导文案, 完全按后端给的 reason 分流 —— 层级判断只在后端一处, 前端不再自己组合条件推导
	// 关键: 今天不是抽奖日(weekday)时绝不能提充值, 否则会员充了钱回来发现按钮照样是灰的
	// no_quota 返回空串: 按钮上已有 "No spins left", 这里再说一遍是重复
	// 纯充值赚取制(白给次数=0)下会员一进来就是"没次数", need_topup 给出口, 免得以为按钮坏了
	this.spinHint = function() {
		if (this.canSpin) return '';
		if (this.reason === 'weekday') return ''; // 按钮已改写为"今天不可抽", 规则说明里列着抽奖日, 不再重复
		if (this.reason === 'pool_empty') return ''; // 按钮已改写为"奖品已抽完", 充值也换不来奖品, 不能提充值
		if (this.reason === 'need_topup' && this.minTopup > 0) {
			var currency = (typeof theSettings !== 'undefined' && theSettings.currency) ? theSettings.currency : '';
			return translate_string('Top up to earn a spin') + ': ' + currency + ' ' + this.minTopup;
		}
		return '';
	}

	// 判断当前会员组是否可参与(控制入口显示), 由 listen.js client_status 钩子在登录后调用
	// 规则与后端一致: allowed_groups 为空 → 允许所有正常组(member_group_id>=0, 排除 guest); 否则需在列表内
	this.updateEligible = function() {
		var groups = this.config().allowed_groups || [];
		var gid = (typeof thePCStatus !== 'undefined' && thePCStatus.member_group_id != null) ? parseInt(thePCStatus.member_group_id) : -1;
		this.eligible = (groups.length === 0) ? (gid >= 0) : (groups.indexOf(gid) !== -1);
	}

	// 刷新入口按钮上的剩余次数徽章
	// 单独一个方法而不是塞进 maybeAutoPop: 后者在 auto_pop=0(默认)时会提前 return, 拿不到次数,
	// 按钮徽章就永远是空的。登录后、充值到账后都要调它
	this.refreshRemaining = async function() {
		if (!this.eligible) return;
		if (!(typeof theSettings !== 'undefined' && theSettings.lucky_spin_enable == 1)) return;
		await this.checkStatus();
	}

	// 登录后自动弹窗: 启用 + 资格符合 + auto_pop=1 + 今日可抽 + 本次会话未弹过(由 listen.js client_status 钩子触发)
	this.maybeAutoPop = async function() {
		if (this._autoPopped) return;
		if (!this.eligible) return;
		if (!(typeof theSettings !== 'undefined' && theSettings.lucky_spin_enable == 1)) return;
		if (!this.config().auto_pop) return;
		var res = await this.checkStatus();
		if (res && res.can_spin == 1) {
			this._autoPopped = true;
			var that = this;
			setTimeout(function () { that.open(); }, 2500);
		}
	}

	this.showResult = function(prize) {
		var currency = (typeof theSettings !== 'undefined' && theSettings.currency) ? theSettings.currency : '';
		// 没中奖时 title 之前写死是 "Congratulations!"，只有 text 换成了 "Better luck next time!"，
		// 弹窗变成"恭喜你！很遗憾没中奖"这种自相矛盾的文案。title/type 也要跟着中没中奖一起变。
		var isWin = !!(prize && prize.type !== 'none');
		var msg;
		if (!isWin) {
			msg = '';
		} else if (prize.type === 'bonus') {
			msg = translate_string('You won') + ' ' + currency + ' ' + prize.value + ' ' + translate_string('Bonus');
		} else if (prize.type === 'offer') {
			msg = translate_string('You won') + ' ' + (prize.name || (prize.mins + ' ' + translate_string('mins')));
		} else {
			msg = translate_string('Congratulations!');
		}
		sweetAlert({
			title: isWin ? translate_string('Congratulations!') : translate_string('Better luck next time!'),
			text: msg,
			type: isWin ? 'success' : 'info'
		});
	}

	// 进入记录视图(从第一页开始, 与客户端余额历史同款分页)
	this.loadRecords = function() {
		this.showRecords = true;
		this.recordsPaging.page = 1;
		this.fetchRecords();
	}

	this.fetchRecords = async function() {
		var res = await theApiClient.callCafeApi('spinWheel/records', 'GET', { page: this.recordsPaging.page }).catch(function () { return null; });
		this.records = (res && res.items) ? res.items : [];
		if (res && res.paging_info) this.recordsPaging = res.paging_info;
	}

	this.recordsPageFirst = function() { this.recordsPaging.page = 1; this.fetchRecords(); }
	this.recordsPagePrev = function() { if (this.recordsPaging.page > 1) { this.recordsPaging.page--; this.fetchRecords(); } }
	this.recordsPageNext = function() { if (this.recordsPaging.page < this.recordsPaging.pages) { this.recordsPaging.page++; this.fetchRecords(); } }
	this.recordsPageLast = function() { this.recordsPaging.page = this.recordsPaging.pages; this.fetchRecords(); }
	this.recordsPageGo = function(p) { this.recordsPaging.page = p; this.fetchRecords(); }

	// 中奖记录列表展示文字(后端 log_details 已是可读文字)
	this.rewardText = function(r) {
		return r ? (r.detail || '') : '';
	}
}
