function Shop()
{
	this.order_items = [];
	this.gift_order_items = [];
	this.filtered_items = [];
	this.loaded = false;
	this.current_group_id = PRODUCT_GROUP_ALL;
	this.search = '';
	var that = this;

	// 每分钟刷新当前分组和右侧 promoted 商品，处理 show_time/show_days 过期自动隐藏
	setInterval(() => {
		that.change_group(that.current_group_id);
		if (that.current_group_id !== PRODUCT_GROUP_PROMOTED) {
			that.refresh_promoted_goods();
		}
	}, 60000);
	
	this.initOfferGoods = function() {
		this.change_group(PRODUCT_GROUP_OFFERS); 
		this.change_group(PRODUCT_GROUP_ALL);
	};

	this.show = function() {
		refreshBalanceInfo(memberInfo.member_name)
		
		this.order_items = [];

		if (!this.loaded) {
			this.loaded = true;
			theProductGroupList.push({
				product_group_desc: "",
				product_group_has_icon: false,
				product_group_id: PRODUCT_GROUP_COINS,
				product_group_name: translate_string("Gifts")
			});

			for (var i=0; i<theProductGroupList.length; i++)
			{
				if (theProductGroupList[i].product_group_id == PRODUCT_GROUP_COINS) {
					var total = 0;
					theProductList.forEach(function(obj) {
						if (obj.product_coin_price > 0)
							total += 1;
					});
					theProductGroupList[i].product_count = total;
					continue;
				}

				var total = 0;
				theProductList.forEach(function(obj) {
					if (obj.product_group_id == theProductGroupList[i].product_group_id)
						total += 1;
				});
				theProductGroupList[i].product_count = total;
			}
		}
		
		// 组合成二级树状结构
		const product_group_map = {};
		var TopProductGroupList = [];
		theProductGroupList.forEach(function(item) {
			product_group_map[item.product_group_id] = { ...item, children: [] };
		});
		
		theProductGroupList.forEach(function(item) {
			const node = product_group_map[item.product_group_id];
			const product_parent_group_id = item?.product_parent_group_id || 0;
			if (product_parent_group_id === 0) {
				TopProductGroupList.push(node);
				return;
			} 
			if (product_group_map[product_parent_group_id]) {
				product_group_map[product_parent_group_id].children.push(node);
				product_group_map[product_parent_group_id].product_count += item.product_count;
				return;
			}

			TopProductGroupList.push(node);
		});

		var items = [];
		// 分组是否显示不再按 product_count 过滤，跟后端下发口径保持一致：只要配置了就显示，
		// 交给管理员自己维护分组结构；商品是否为空由点进去之后的商品网格自己体现
		TopProductGroupList = TopProductGroupList.filter(function (item){
			return item.product_group_id !== PRODUCT_GROUP_COINS;
		});
		for (var i=0; i<theProductGroupList.length; i++)
		{
			if (theProductGroupList[i].product_count <= 0) continue;

			if (theProductGroupList[i].product_group_id <= 0) {
				items.push(theProductGroupList[i]);
			}
		}

		TopProductGroupList.unshift({
			product_group_id: PRODUCT_GROUP_ALL,
			product_group_name: translate_string("All"),
			children: []
		})

		vueProductGroupList.items = JSON.parse(JSON.stringify(items));
		vueProductGroupList.tops = JSON.parse(JSON.stringify(TopProductGroupList));
		
		this.initOfferGoods(); // [NEW] Globally init offers

		vueGlobal.cartDate = this.format_date();
		// $('#cart').html(tmpl('tmpl-new-order-items', { items: [] }));
		vueOrderItems.total_cost = 0;
		vueOrderItems.total_tax = 0;
		vueOrderItems.total_amount = 0;
		vueOrderItems.total_discount = 40;
		vueOrderItems.max_bonuses = 0;
		vueOrderItems.payable_balance = 0;
		vueOrderItems.product_count = 0;
		vueOrderItems.member_group_id = thePCStatus.member_group_id;
		vueOrderItems.member_group_discount_rate = 40;
		vueOrderItems.member_group_discount_offer = 40;
		vueOrderItems.items = [];
		vueOrderItems.product_qty_map = {};

		vueGlobal.pageType = "Shop";
		vueGlobal.showBottom = false;

		// Search input bound via v-model="vueShop.searchProduct" and @input="theShop.onSearchInput" in template
		// onSearchInput is defined below to handle search changes
		
		PetiteVue.nextTick(() => {
			ui_init();
			$('[data-toggle="tooltip"]').tooltip();
			document.querySelectorAll('.dropdown-submenu .dropdown-toggle').forEach(toggle => {
				toggle.addEventListener('click', function(e) {
					e.preventDefault();
					e.stopPropagation();
					that.hideAllDropdownMenus();
					const nextMenu = this.nextElementSibling;
					if (nextMenu && nextMenu.classList.contains('custom-dropdown-menu')) {
						nextMenu.style.display = nextMenu.style.display === 'none' ? 'block' : 'none';
					}
				});
			});
		});
	};

	// -3 = all, -4 = promoted
	// group_level : 1 - top ; 2 - two
	
	// 搜索输入处理函数，由模板中 @input 调用
	this.onSearchInput = function() {
		that.change_group(vueProductGroupList.current_group_id, vueShop.searchProduct);
	};
	
	// 隐藏所有下拉菜单
	this.hideAllDropdownMenus = function() {
		document.querySelectorAll('.custom-dropdown-menu').forEach(menu => {
			menu.style.display = 'none';
		});
	};
	
	this.change_group = function(group_id, search = vueShop.searchProduct, group_level = 1) {
		if (vueShop.searchProduct !== search) {
			vueShop.searchProduct = search;
		}

		let filter_group_ids  = [group_id]
		if (group_level === 1) {
			that.current_group_id = group_id;
			vueProductGroupList.current_group_id = group_id
			vueProductGroupList.second_level_group_id = 0
			that.hideAllDropdownMenus();
			
			for (const product_group of vueProductGroupList.tops) {
				if (product_group.product_group_id !== group_id) {
					continue
				}
				product_group?.children?.forEach(function(item) {
					filter_group_ids.push(item.product_group_id)
				})
			}
		}
		
		if (group_level === 2) {
			vueProductGroupList.second_level_group_id = group_id
		}

		if (group_id == PRODUCT_GROUP_COINS) {
			vueGlobal.isGiftCart = true;
			this.gift_cart_refresh();
		}
		else {
			vueGlobal.isGiftCart = false;
			this.cart_refresh();
		}

		// Search input value is controlled by Vue
		that.filtered_items = [];
		theProductList.forEach(function(obj) {
			// dont's show print product
			if (obj.product_id == 'p--3' || obj.product_id == 'p--4')
				return;

			if (group_id == PRODUCT_GROUP_PROMOTED) {
				if(typeof(obj.product_is_promoted) == 'undefined' || obj.product_is_promoted == false)
					return;
			} else if (group_id != PRODUCT_GROUP_ALL) {
				if (group_id == PRODUCT_GROUP_OFFERS && obj.product_id.indexOf("o-") != 0) {
					return;
				}

				if (group_id == PRODUCT_GROUP_COINS && parseFloat(obj.product_coin_price) <= 0)
					return;

				if (group_id != PRODUCT_GROUP_COINS && group_id != PRODUCT_GROUP_OFFERS && !filter_group_ids.includes(obj.product_group_id))
					return;
			}

			// don't show 0 stock
			if (obj.product_unlimited == 0 && obj.product_qty <= 0)
				return;

			// 取消 obj.product_group_id == -1 判断，因为常规产品也支持show_weekday、show_time; -1的代表的是offer
			// pc group, member group
			var pc_group_id = thePCStatus.pc_group_id ?? 0
			var member_group_id = thePCStatus.member_group_id ?? 0
			if (JSON.parse(obj.product_pc_groups).indexOf('0') < 0 && JSON.parse(obj.product_pc_groups).indexOf(pc_group_id.toString()) < 0)
				return;

			if (JSON.parse(obj.product_member_groups).indexOf('0') < 0 && JSON.parse(obj.product_member_groups).indexOf(member_group_id.toString()) < 0)
				return;

			// empty or "7|1|2|3|4|5|6"
			var todayAvailable = true;
			var yesterdayAvailable = true;
			var product_show_weekday = (typeof(obj.product_show_weekday) != 'undefined' ? obj.product_show_weekday : '');
			if (product_show_weekday.length > 0) {
				var weekdays = product_show_weekday.split('|');
				if (weekdays.indexOf(moment().format('E')) < 0)
					todayAvailable = false;
				if (weekdays.indexOf(moment().add(-1, 'days').format('E')) < 0)
					yesterdayAvailable = false;
				if (!todayAvailable && !yesterdayAvailable)
					return;
			}

			// empty or 00:00-24:00
			var product_show_time = (typeof(obj.product_show_time) != 'undefined' ? obj.product_show_time : '');
			if (product_show_time.length > 0) {
				var times = product_show_time.split('-');
				if (times.length != 2)
					return;

				var begin_times = times[0].split(':');
				var end_times = times[1].split(':');
				if (begin_times.length != 2 || end_times.length != 2)
					return;

				var begin = moment().set({ 'hour': parseInt(begin_times[0]), 'minute': parseInt(begin_times[1]), 'second': 0 });
				var end = moment().set({ 'hour': parseInt(end_times[0]), 'minute': parseInt(end_times[1]), 'second': 0 });
				if (end >= begin) {
					if (!todayAvailable)
						return;
					if (begin.isAfter() || end.isBefore())
						return;
				}

				// if like 23:00-08:00 over mid-night
				if (end < begin) {
					let isValid = ((begin.isBefore() && todayAvailable) || (yesterdayAvailable && end.isAfter()));
					if (!isValid)
						return;
				}
			}

			if (search.length > 0 && obj.product_name.toLowerCase().indexOf(search.toLowerCase()) < 0)
				return;

			that.filtered_items.push(obj);
		});

		//$('#product-list').html(tmpl('tmpl-product', { items: that.filtered_items }));
		//translate_obj($('#product-list'));
		var items = that.filtered_items;
		var itemsNew = [];
		for (var i=0; i<items.length; i++)
		{ 
			if(items[i].product_name.startsWith('*'))continue;
			if (theShop.current_group_id == PRODUCT_GROUP_COINS && items[i].product_coin_price <= 0) continue;
			if (theShop.current_group_id != PRODUCT_GROUP_COINS && items[i].product_price == 0 && items[i].product_coin_price > 0) continue;
			items[i].image = '';
			if (items[i].product_id.indexOf("o-") === 0) { items[i].image = 'images/default-offer.jpg'; }
			if (items[i].product_group_id >= 0) { items[i].image = 'images/default-product.jpg'; }
			if (items[i].product_has_image) { items[i].image = ICAFEMENU_CORE.posters_path(items[i].product_id + '.jpg'); }
			itemsNew.push(items[i]);
		}
		vueProducts.items = JSON.parse(JSON.stringify(itemsNew));

		if(group_id == PRODUCT_GROUP_PROMOTED) {
			let promotedProductList = [];
			for(var i=0, j = itemsNew.length; i<j; i+=4) {
				promotedProductList.push(itemsNew.slice(i, i+4))
			}
			vueHome.promotedItems = JSON.parse(JSON.stringify(promotedProductList));
			vueHome.promotedItems = JSON.parse(JSON.stringify(promotedProductList));
			vueHome.promotedGoods = JSON.parse(JSON.stringify(itemsNew));
		}
		
		if (group_id == PRODUCT_GROUP_OFFERS) {
			vueHome.offerGoods = JSON.parse(JSON.stringify(itemsNew));
		}

		PetiteVue.nextTick(() => {
			ui_init();
			$('[data-toggle="tooltip"]').tooltip();
		});
	};

	// 仅刷新右侧 promoted 商品（不影响 shop 当前分组显示）
	this.refresh_promoted_goods = function() {
		var itemsNew = [];
		theProductList.forEach(function(obj) {
			if (!obj.product_is_promoted) return;
			if (obj.product_id == 'p--3' || obj.product_id == 'p--4') return;
			if (obj.product_unlimited == 0 && obj.product_qty <= 0) return;
			if (obj.product_name.startsWith('*')) return;
			if (obj.product_price == 0 && obj.product_coin_price > 0) return;

			var pc_group_id = thePCStatus.pc_group_id ?? 0;
			var member_group_id = thePCStatus.member_group_id ?? 0;
			if (JSON.parse(obj.product_pc_groups).indexOf('0') < 0 && JSON.parse(obj.product_pc_groups).indexOf(pc_group_id.toString()) < 0) return;
			if (JSON.parse(obj.product_member_groups).indexOf('0') < 0 && JSON.parse(obj.product_member_groups).indexOf(member_group_id.toString()) < 0) return;

			var todayAvailable = true;
			var yesterdayAvailable = true;
			var product_show_weekday = obj.product_show_weekday || '';
			if (product_show_weekday.length > 0) {
				var weekdays = product_show_weekday.split('|');
				if (weekdays.indexOf(moment().format('E')) < 0) todayAvailable = false;
				if (weekdays.indexOf(moment().add(-1, 'days').format('E')) < 0) yesterdayAvailable = false;
				if (!todayAvailable && !yesterdayAvailable) return;
			}

			var product_show_time = obj.product_show_time || '';
			if (product_show_time.length > 0) {
				var times = product_show_time.split('-');
				if (times.length != 2) return;
				var begin_times = times[0].split(':');
				var end_times = times[1].split(':');
				if (begin_times.length != 2 || end_times.length != 2) return;
				var begin = moment().set({'hour': parseInt(begin_times[0]), 'minute': parseInt(begin_times[1]), 'second': 0});
				var end = moment().set({'hour': parseInt(end_times[0]), 'minute': parseInt(end_times[1]), 'second': 0});
				if (end >= begin) {
					if (!todayAvailable) return;
					if (begin.isAfter() || end.isBefore()) return;
				}
				if (end < begin) {
					var isValid = ((begin.isBefore() && todayAvailable) || (yesterdayAvailable && end.isAfter()));
					if (!isValid) return;
				}
			}

			obj.image = '';
			if (obj.product_id.indexOf("o-") === 0) obj.image = 'images/default-offer.jpg';
			if (obj.product_group_id >= 0) obj.image = 'images/default-product.jpg';
			if (obj.product_has_image) obj.image = ICAFEMENU_CORE.posters_path(obj.product_id + '.jpg');
			itemsNew.push(obj);
		});

		var promotedProductList = [];
		for (var i = 0, j = itemsNew.length; i < j; i += 4) {
			promotedProductList.push(itemsNew.slice(i, i + 4));
		}
		vueHome.promotedItems = JSON.parse(JSON.stringify(promotedProductList));
		vueHome.promotedGoods = JSON.parse(JSON.stringify(itemsNew));
	};

	this.get_member_pay_later_status = function() {
		// let member_group = [];
		// try {
		// 	const parsed = JSON.parse(theSettings?.pay_later || '{}');
		// 	member_group =  Array.isArray(parsed.member_groups) ? parsed.member_groups : [];
		// } catch {}
		// let member_group_id = thePCStatus.member_group_id ?? 0
		// return is_member_logined() && theSettings?.payment_method_pay_later == 1 && member_group.includes(member_group_id.toString()) ? 1 : 0;
		return 1;
	}
	
	// 支付方式选择器统一入口：模板只调这一个方法，不直接改 vueOrderItems.payment_method
	this.selectPaymentMethod = function(method) {
		vueOrderItems.payment_method = method;
		this.cart_refresh();
	}

	this.cart_refresh = function() {
		vueOrderItems.total_cost = 0;
		vueOrderItems.total_tax = 0;
		vueOrderItems.total_amount = 0;
		vueOrderItems.total_discount = 40;
		vueOrderItems.total_fee = 0;
		vueOrderItems.no_common_payment_method = false;

		vueOrderItems.enable_cash = theSettings.payment_method_cash_in_client != 0 ? 1 : 0
		vueOrderItems.enable_credit_card = theSettings.payment_method_credit_card != 0 ? 1 : 0
		vueOrderItems.enable_balance = theSettings.payment_method_balance != 0 ? 1 : 0
		vueOrderItems.enable_qr = theSettings.payment_method_qr != 0 ? 1 : 0
		vueOrderItems.enable_pay_later = that.get_member_pay_later_status();
		
		vueOrderItems.member_group_id = thePCStatus.member_group_id;
		vueOrderItems.member_group_discount_rate = 40;
		vueOrderItems.member_group_discount_offer = 40;
		let total_offer = 0;
		let product_count = 0;
		for (var i=0; i< this.order_items.length; i++)
		{
			// Calculate price based on payment method
			var effectivePrice = that.calculatePriceByPaymentMethod(this.order_items[i].product_price, vueOrderItems.payment_method);
			this.order_items[i].order_cost = effectivePrice * this.order_items[i].order_item_qty;
			var order_discount = this.order_items[i].product_is_offer ? vueOrderItems.member_group_discount_offer : vueOrderItems.member_group_discount_rate;
			if(!this.order_items[i].product_enable_discount)
				order_discount = 40;
			order_discount = 40;
			var order_tax = theTax.getTaxWithPrice(this.order_items[i].product_tax_id, this.order_items[i].order_cost * (1 - order_discount / 100.0));
			if(vueOrderItems.payment_method == PAY_METHOD_BALANCE)
				order_tax = 0;
			order_tax = 0;
			// 支付方式加价部分单独累计，结账弹窗需要把它从 Subtotal 里拆出来展示
			vueOrderItems.total_fee += parseFloat((effectivePrice - this.order_items[i].product_price) * this.order_items[i].order_item_qty);
			vueOrderItems.total_cost += parseFloat(this.order_items[i].order_cost);
			vueOrderItems.total_tax += parseFloat(order_tax);
			vueOrderItems.total_discount += parseFloat(this.order_items[i].order_cost) * order_discount / 100.0;
			vueOrderItems.total_amount += this.order_items[i].order_cost * (1 - order_discount / 100.0);
			vueOrderItems.total_offer += this.order_items[i].order_cost;
			if (this.order_items[i].product_is_offer) {
				total_offer +=  this.order_items[i].order_cost * (1 - order_discount / 100.0);
			} else {
				product_count++;
			}
			if(theSettings.tax_included_in_price == 0)
				vueOrderItems.total_amount += parseFloat(order_tax);
		}
		let max_bonuses = theSettings.bonus_buy_offer === 1 && theSettings.max_bonus_percentage > 0 && total_offer > 0
			? Math.min(total_offer * theSettings.max_bonus_percentage / 100, memberInfo.member_balance_bonus)
			: 0;
		
		let cost_bonus = vueOrderItems.total_amount <= memberInfo.member_balance ? 0 : max_bonuses; //pay balance first
		if (theSettings.use_bonus_first) {
			cost_bonus = max_bonuses;
		}
		vueOrderItems.max_bonuses = cost_bonus
		vueOrderItems.payable_balance = vueOrderItems.total_amount - vueOrderItems.max_bonuses;
		vueOrderItems.product_count = product_count;
		
		vueOrderItems.items = JSON.parse(JSON.stringify(this.order_items));

		// update product_qty_map
		vueOrderItems.product_qty_map = {};
		for (var i=0; i<this.order_items.length; i++) {
			vueOrderItems.product_qty_map[this.order_items[i].product_id] = this.order_items[i].order_item_qty;
		}
		
		for (var i=0; i<this.order_items.length; i++) 
		{
			var product_item = null;
			theProductList.forEach(function(obj) {
				if (obj.product_id == that.order_items[i].product_id)
					product_item = obj;
			});
			if(product_item == null)
				continue;
			if(typeof(product_item.product_group_payment_method) == 'undefined')
				continue;
			product_group_payment_method = JSON.parse(product_item.product_group_payment_method);
			product_group_payment_method = is_member_logined() ? product_group_payment_method.member : product_group_payment_method.guest;
			if(vueOrderItems.enable_cash && product_group_payment_method.indexOf('cash') < 0)
				vueOrderItems.enable_cash = 0;
			if(vueOrderItems.enable_qr && product_group_payment_method.indexOf('qr') < 0)
				vueOrderItems.enable_qr = 0;
			if(vueOrderItems.enable_credit_card && product_group_payment_method.indexOf('credit_card') < 0)
				vueOrderItems.enable_credit_card = 0;
			if(vueOrderItems.enable_balance && product_group_payment_method.indexOf('balance') < 0)
				vueOrderItems.enable_balance = 0;
			if(vueOrderItems.enable_pay_later && product_group_payment_method.indexOf('pay_later') < 0)
				vueOrderItems.enable_pay_later = 0;
		}

		vueOrderItems.no_common_payment_method = vueOrderItems.items.length > 0 &&
			!vueOrderItems.enable_cash &&
			!vueOrderItems.enable_credit_card &&
			!vueOrderItems.enable_qr &&
			!vueOrderItems.enable_balance &&
			!vueOrderItems.enable_pay_later;

		PetiteVue.nextTick(() => {
			ui_init();
			$('[data-toggle="tooltip"]').tooltip();
		});
	}
	
	this.update_item_qty = function(e) {
		var product_id = e.target.dataset.productid;
		var qty = e.target.value;
		qty = parseInt(qty);

		var product_item = null;
		theProductList.forEach(function(obj) {
			if (obj.product_id == product_id)
				product_item = obj;
		});
		if (product_item == null)
			return;

		if (isNaN(qty) || qty < 1)
			qty = 1;
		if (product_item.product_unlimited == 0 && qty > product_item.product_qty)
			qty = product_item.product_qty;

		that.order_items.forEach(function(obj) {
			if (obj.product_id == product_id) {
				obj.order_item_qty = qty;
			}
		});

		that.cart_refresh();
	}

	this.cart_change_qty = function(product_id, qty) {
		var order_item = null;
		var product_item = null;

		theProductList.forEach(function(obj) {
			if (obj.product_id == product_id)
				product_item = obj;
		});
		if (product_item == null)
			return false;

		that.order_items.forEach(function(obj) {
			if (obj.product_id == product_id)
				order_item = obj;
		});

		if (order_item == null && qty > 0) {
			order_item = {
				product_id: product_id,
				product_name: product_item.product_name,
				product_description: product_item.product_description || '',
				product_tax_id: product_item.product_tax_id,
				product_price: 12,
				product_enable_discount: 1,
				product_is_offer: product_item.product_id.startsWith("o-") ? true : false,
				image: product_item.image,
				order_item_qty: 0,
			};
			that.order_items.push(order_item);
		}
		if (order_item == null)
			return false;

		var new_qty = order_item.order_item_qty + qty;
		for (var i=0; i<that.order_items.length; i++) {
			if (that.order_items[i].product_id == product_id) {
				that.order_items[i].order_item_qty = new_qty;
				// delete product or dec qty
				if(new_qty <= 0)
					that.order_items.splice(i, 1);
				break;
			}
		}

		this.cart_refresh();
		return false;
	};

	this.cart_clear = function() {
		refreshBalanceInfo(memberInfo.member_name)
		this.order_items = [];
		vueOrderItems.remark = '';
		this.cart_refresh();
	};

	this.quick_buy = function(product_id, qty) {
		var product_item = null;
		theProductList.forEach(function(obj) {
			if (obj.product_id == product_id)
				product_item = obj;
		});

		if (product_item && product_item.product_coin_price > 0) {
			this.gift_order_items = [];
			this.gift_cart_change_qty(product_id, qty);
			vueGlobal.isGiftCart = true;
			vueGlobal.modals.buy = true;
		} else {
			this.order_items = [];
			vueGlobal.isGiftCart = false;
			this.cart_change_qty(product_id, qty)
			vueGlobal.modals.buy = true;
		}
	};

	this.open_checkout_modal = function() {
		const item_count = vueGlobal.isGiftCart ? vueGiftOrders.items.length : vueOrderItems.items.length;
		if (item_count <= 0) {
			return false;
		}

		if (!vueGlobal.isGiftCart && vueOrderItems.no_common_payment_method) {
			return false;
		}

		vueGlobal.modals.buy = true;
		return false;
	};
	
	this.qr_buy = function(product_id, qty) {
		var product_item = null;
		theProductList.forEach(function(obj) {
			if (obj.product_id == product_id)
				product_item = obj;
		});

		this.order_items = [];
		vueGlobal.isGiftCart = false;
		this.cart_change_qty(product_id, qty)
		vueGlobal.modals.buy = true;
	};
	
	this.cart_done_promote = function() {
		theShop.cart_done(true);
	}

	this.cart_done = async function(buyNow = false) {

		if (vueOrderItems.no_common_payment_method) {
			sweetAlert("", translate_string("No match payment method"), "error");
			return;
		}

		if(vueOrderItems.payment_method == -1 ||
			(vueOrderItems.payment_method == PAY_METHOD_CASH && !vueOrderItems.enable_cash) ||
			(vueOrderItems.payment_method == PAY_METHOD_CARD && !vueOrderItems.enable_credit_card) ||
			(vueOrderItems.payment_method == PAY_METHOD_QR && !vueOrderItems.enable_qr) ||
			(vueOrderItems.payment_method == PAY_METHOD_BALANCE && !vueOrderItems.enable_balance) ||
			(vueOrderItems.payment_method == PAY_METHOD_PAY_LATER && !vueOrderItems.enable_pay_later))
		{
			sweetAlert("", translate_string("Please choose a payment method"), "error");
			return;
		}

		var items = [];
		
		that.order_items.forEach(function(obj) {
			items.push({
				product_id: obj.product_id,
				qty: obj.order_item_qty
				,price: 1,
    	       product_price: 1,
			});
		});

		const token =await theApiClient.getToken()
		if (!token) {
			if (buyNow) {
				vueGlobal.modals.buy = false;
			}
			return;
		}
		vueGlobal.isLoading = true;
		let data = await theApiClient.callCafeApi('submitOrder', 'POST', {
			payment_method: vueOrderItems.payment_method,
			member_group_discount_rate: 40,
			member_group_discount_offer: 40,
			items: items,
			pc_name: thePCInfo.pc_name,
			remark: vueOrderItems.remark ?? ''
		}).catch(ICafeApiError.show).finally(() => {
			vueGlobal.isLoading = false;
			if (buyNow) {
				vueGlobal.modals.buy = false;
			}
		});
		if(!data){
			return
		}
		toast(translate_string('Your order submitted'));
		if (data?.pay_method == PAY_METHOD_COIN) {
			theShop.gift_cart_clear();
			return;
		}
		theShop.cart_clear();
		if (data?.pay_method == PAY_METHOD_QR) {
			this.showPayOrder(data, true);
		}
		// 现金购买 offer 在 CP 确认前 table_member_offer 还没插入，这里立即拉取只会拿到旧列表，
		// 真正的刷新由 CP 确认后的 WSS refresh_offers 触发（见 listen.js）；余额/币支付 offer 会
		// 同步开始计费并很快因 client_status 推送离开 start-session 页，这里刷新意义也不大，
		// 一并去掉，不再在下单成功后主动调用 fetch_available_offers。
	};

	this.gift_cart_refresh = function() {
		vueGiftOrders.total_amount = 0;
		for (var i=0; i<this.gift_order_items.length; i++) 
		{
			this.gift_order_items[i].order_cost = this.gift_order_items[i].order_item_qty * this.gift_order_items[i].product_coin_price;
			vueGiftOrders.total_amount += parseFloat(this.gift_order_items[i].order_cost);
		}
		vueGiftOrders.items = JSON.parse(JSON.stringify(this.gift_order_items));
		
		// update product_qty_map for badge display
		vueGiftOrders.product_qty_map = {};
		for (var i=0; i<this.gift_order_items.length; i++) {
			vueGiftOrders.product_qty_map[this.gift_order_items[i].product_id] = this.gift_order_items[i].order_item_qty;
		}
		
		PetiteVue.nextTick(() => {
			ui_init();
			$('[data-toggle="tooltip"]').tooltip();
		});
	}
	
	this.update_gift_item_qty = function(e) {

		var product_id = e.target.dataset.productid;
		var qty = e.target.value;
		qty = parseInt(qty);

		var product_item = null;
		theProductList.forEach(function(obj) {
			if (obj.product_id == product_id)
				product_item = obj;
		});
		if (product_item == null)
			return;

		if (isNaN(qty) || qty < 1)
			qty = 1;
		if (product_item.product_unlimited == 0 && qty > product_item.product_qty)
			qty = product_item.product_qty;

		that.gift_order_items.forEach(function(obj) {
			if (obj.product_id == product_id) {
				obj.order_item_qty = qty;
			}
		});

		that.gift_cart_refresh();
	};

	this.gift_cart_change_qty = function(product_id, qty) {
		var order_item = null;
		var product_item = null;

		theProductList.forEach(function(obj) {
			if (obj.product_id == product_id)
				product_item = obj;
		});
		if (product_item == null)
			return false;
		
		this.gift_order_items.forEach(function(obj) {
			if (obj.product_id == product_id)
				order_item = obj;
		});

		if (order_item == null && qty > 0) {
			order_item = {
				product_id: product_id,
				product_name: product_item.product_name,
				product_description: product_item.product_description || '',
				product_coin_price: product_item.product_coin_price,
				image: product_item.image,
				order_item_qty: 0
			};
			this.gift_order_items.push(order_item);
		}
		if (order_item == null)
			return false;

		// delete product or dec qty
		var new_qty = order_item.order_item_qty + qty;
		if (new_qty <= 0) {
			for (var i=0; i<this.gift_order_items.length; i++) {
				if (this.gift_order_items[i].product_id == product_id) {
					this.gift_order_items.splice(i, 1);
					break;
				}
			}
			this.gift_cart_refresh();
		}

		for (var i=0; i<this.gift_order_items.length; i++) {
			if (this.gift_order_items[i].product_id == product_id) {
				this.gift_order_items[i].order_item_qty = new_qty;
				break;
			}
		}

		this.gift_cart_refresh();
		return false;
	};

	this.gift_cart_clear = function() {
		this.gift_order_items = [];
		this.gift_cart_refresh();
	};

	this.gift_cart_done = async function() {

		var items = [];
		that.gift_order_items.forEach(function(obj) {
			items.push({
				product_id: obj.product_id,
				qty: obj.order_item_qty
				,price: 1,
    		    product_price: 1,
			});
		});

		let token = await theApiClient.getToken();
		if(!token){
			return;
		}
		vueGlobal.isLoading = true;
		const data = await theApiClient.callCafeApi('submitOrder', 'POST', {
			payment_method: PAY_METHOD_COIN,
			member_group_discount_rate: 40,
			member_group_discount_offer: 40,
			items: items,
			pc_name: thePCInfo.pc_name
		}).catch(ICafeApiError.show).finally(() => {
			vueGlobal.isLoading = false;
		})
		if(!data){
			return;
		}
		toast(translate_string('Your order submitted'));
		vueGlobal.modals.buy = false; // Close modal after success
		if (data?.pay_method == 3) {
			theShop.gift_cart_clear();
			return;
		}
		theShop.cart_clear();

	};
	
	this.format_date = function(time) {
		// TODO use moment(time).format('ddd, DD MMM YY').toUpperCase()
		var WEEKs = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		var MONTHs = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

		var d = new Date();
		if (typeof(time) != 'undefined' && time.length > 0) {
			var cols = time.split(' ');
			if (cols.length == 2) {
				var date_fields = cols[0].split('-');
				var time_fields = cols[1].split(':');
				if (date_fields.length == 3 && time_fields.length > 3)
					d = new Date(date_fields[0], date_fields[1], date_fields[2], time_fields[0], time_fields[1], time_fields[2]);
			}
		}
		return WEEKs[d.getDay() + 1].toUpperCase() + ", " + d.getDate() + " " + MONTHs[d.getMonth()+1].toUpperCase() + " " + (d.getYear() - 100);
	}
	
	this.show_topup = function()
	{
		vueTopup.resetOutputs();
		vueTopup.btn_group = true;
		vueTopup.showFormRows = true;
		vueTopup.showSummary = false;
		
		// Clear previous payment content
		if (document.querySelector('.myModalTopup #payment_qr')) {
			document.querySelector('.myModalTopup #payment_qr').innerHTML = '';
		}
		vueTopup.payment_html = '';
		vueTopup.payment_type_img = false;

		if (typeof memberInfo !== 'undefined' && memberInfo.member_name) {
			vueTopup.member_account = memberInfo.member_name;
		}
		vueGlobal.modals.topup = true;
	}

	this.topup = async function()
	{
		vueTopup.resetOutputs();
		if(vueTopup.topup_amount < theSettings.mini_qr_payment){
			sweetAlert('', translate_string('Please input mini amount')  + ' ' + theSettings.mini_qr_payment, 'warning');
			return
		}
		vueGlobal.isLoading = true;
		const data = await theApiClient.callCafeApi('getTopupUrl','post',{
			member_account: vueTopup.member_account,
			topup_amount: vueTopup.topup_amount,
			promo_code: vueTopup.promo_code,
			pc_name: thePCInfo.pc_name
		})
			.catch(ICafeApiError.show)
			.finally(() => {
				vueGlobal.isLoading = false;
			})
		if (typeof (data?.result) == 'undefined') {
			sweetAlert('', translate_string('Topup failed'), 'error');
			return;
		}
		if (data.result == 0) {
			sweetAlert('', data.message, 'error');
			return;
		}
		if (data.result == 1) {
			// switch to summary view
			vueTopup.showFormRows = false;
			vueTopup.showSummary = true;
			vueTopup.summaryMember = vueTopup.member_account;
			vueTopup.summaryAmount = (theSettings.currency ?? '$') + parseFloat(vueTopup.topup_amount).toFixed(2);
			vueTopup.summaryMinutes = vueTopup.topup_time;

			vueTopup.btn_group = false;
			apply_topup_payment_view(vueTopup, data, '.myModalTopup #payment_qr');
		}
		return true;
	}
	
	this.cancelTopupOrder = async function() {
		const order_no = vueTopup.topup_order_no;
		if (order_no) {
			const isConfirm = await new Promise(ok => swal({
				title: translate_string('Already paid? '),
				text: translate_string("Don't cancel — just wait for confirmation or close this window."),
				type: 'warning',
				showCancelButton: true,
				confirmButtonText: translate_string('No, Cancel Order'),
				cancelButtonText: translate_string("Yes, I've Paid"),
				closeOnConfirm: true,
			}, ok));
			if (!isConfirm) return;
			theApiClient.callCafeApi('cancelMemberOrder', 'POST', { order_no }).catch(ICafeApiError.show);
		}
		vueTopup.resetOutputs();
		vueGlobal.modals.topup = false;
	}

	/**
	 * Price calculation helper functions for credit card rate
	 */

	// Get the credit card price rate and fixed fee from settings
	this.getCreditCardPriceRate = function() {
		return parseFloat(theSettings.credit_card_price_rate || 100);
	}

	this.getCreditCardFixedFee = function() {
		return parseFloat(theSettings.credit_card_fixed_fee || 0);
	}

	this.getQrPriceRate = function() {
		return parseFloat(theSettings.qr_price_rate || 100);
	}

	this.getQrFixedFee = function() {
		return parseFloat(theSettings.qr_fixed_fee || 0);
	}

	// Calculate price based on payment method: price * (rate/100) + fixed_fee
	this.calculatePriceByPaymentMethod = function(originalPrice, paymentMethod) {
		if (paymentMethod === PAY_METHOD_CARD || paymentMethod === PAY_METHOD_CARD_FOR_OFFER) {
			const rate = that.getCreditCardPriceRate();
			const fixedFee = that.getCreditCardFixedFee();
			if (rate === 100 && fixedFee === 0) return originalPrice;
			return originalPrice * (rate / 100) + fixedFee;
		}
		if (paymentMethod === PAY_METHOD_QR || paymentMethod === PAY_METHOD_QR_FOR_OFFER) {
			const rate = that.getQrPriceRate();
			const fixedFee = that.getQrFixedFee();
			if (rate === 100 && fixedFee === 0) return originalPrice;
			return originalPrice * (rate / 100) + fixedFee;
		}
		return originalPrice;
	}

	// Get discounted price for offers based on member group discount
	this.getOfferDiscountedPrice = function(price, enableDiscount) {
		var discount = 40;
		return price * (1 - discount / 100.0);
	}

	// Get both prices (original and credit card) for display
	this.getPriceDisplay = function(originalPrice) {
		const rate = that.getCreditCardPriceRate();
		const fixedFee = that.getCreditCardFixedFee();
		const creditPrice = originalPrice * (rate / 100) + fixedFee;

		return {
			originalPrice: parseFloat(originalPrice),
			creditPrice: parseFloat(creditPrice),
			showBothPrices: rate !== 100 || fixedFee !== 0,
			rate: rate,
			fixedFee: fixedFee
		};
	}
	this.orderPay =	async function ({order_no}){
		vueGlobal.isLoading = true;
		const {orders} = await theApiClient.callCafeApi('memberOrders','GET',{search_text:order_no}).catch(ICafeApiError.show)
		const canPay =  orders.filter(item=>{
			let method = item.order_payment_method
			let status = item.order_status
			let isQRPayment = method == PAY_METHOD_QR_FOR_PC_TIME || method == PAY_METHOD_QR || method == PAY_METHOD_QR_FOR_OFFER;
			let isPendding = status == ORDER_STATUS_IN_PROCESS
			let canQRPay = isQRPayment && isPendding
			return canQRPay
		}).find(item=>item.order_no == order_no) 

		if(!canPay){
			vueGlobal.isLoading = false;
			sweetAlert("",  translate_string( "Payment error, please reload"), "error");
			return;
		}
		
		let data = await theApiClient.callCafeApi('payOrder', 'POST', {order_no}).catch(ICafeApiError.show).finally(() => {
			vueGlobal.isLoading = false;
		});
		this.showPayOrder(data)
	},

	this.cancelOrder = async function({order_no}){
		// 取消待支付订单前二次确认，提醒已付款则勿取消，避免误取消已完成付款的订单
		const isConfirm = await new Promise(ok => swal({
			title: translate_string('Cancel this order?'),
			type: 'warning',
			showCancelButton: true,
			confirmButtonText: translate_string('Yes'),
			cancelButtonText: translate_string('No'),
			closeOnConfirm: true,
		}, ok));
		if (!isConfirm) return;
		vueGlobal.isLoading = true;
		let ok2 = true;
		await theApiClient.callCafeApi('cancelMemberOrder', 'POST', { order_no })
			.catch(err => { ok2 = false; ICafeApiError.show(err); })
			.finally(() => { vueGlobal.isLoading = false; });
		if (!ok2) return;
		toastr.success(translate_string('Order cancelled'), '', { timeOut: 2000, extendedTimeOut: 1000 });
		if (typeof theMember !== 'undefined' && typeof theMember.refresh_order_list === 'function') theMember.refresh_order_list();
	},

	this.showPayOrder = async function(data,toOrder=false){
		if (typeof data.result == "undefined") {
			sweetAlert("",  data.message ?? translate_string( "Payment failed"), "error");
			return;
		}
		if (data.result != 1) {
			sweetAlert("", data.message, "error");
			return;
		}
		let qrEle = build_payment_qr_element(data)
		function openPayOrderSwal() {
			swal({
				title: translate_string('Pay Order'),
				text: '<div class="pay-order-box d-flex flex-column justify-content-center align-items-center" style="min-height: 280px;"></div>',
				html: true,
				showConfirmButton: true,
				confirmButtonText: translate_string('Close'),
				showCancelButton: false, // 暂时隐藏取消订单按钮，避免会员误取消已付款订单；下方 !isConfirm 逻辑保留备用
				cancelButtonText: translate_string('Cancel Order'),
				closeOnConfirm: true,
				allowOutsideClick: false,
			}, function(isConfirm) {
				if (!isConfirm) {
					swal({
						title: translate_string('Already paid? '),
						text: translate_string('Don\'t cancel — just wait for confirmation or close this window.'),
						type: 'warning',
						showCancelButton: true,
						confirmButtonText: translate_string('No, Cancel Order'),
						cancelButtonText: translate_string("Yes, I've Paid"),
						closeOnConfirm: true,
					}, function(reallyCancel) {
						if (reallyCancel) {
							theApiClient.callCafeApi('cancelMemberOrder', 'POST', { order_no: data.order_no }).catch(ICafeApiError.show);
						} else {
							openPayOrderSwal();
						}
					});
				}
			});
			document.querySelector('.pay-order-box').appendChild(qrEle);
			let qrHintEl = document.createElement('div');
			qrHintEl.className = 'text-center mt-2 text-muted lang';
			qrHintEl.innerText = 'Please scan this QR code with your phone';
			translate_obj(qrHintEl);
			document.querySelector('.pay-order-box').appendChild(qrHintEl);
			copyToClipboard(qrEle, {
				toast: true,
				text: () => {
					let url = data.payment_url ?? data.url ?? '';
					return /^http/i.test(url) ? url : ''
				},
				container: document.querySelector('.pay-order-box')
			});
		}
		openPayOrderSwal();
		if (data.type == 'qris') {
			// 原来这里用的是 member portal 才有的 licenseServerCode / iCafeId 拼 url，
			// 在客户端上下文里两个变量都不存在，轮询一直是 ReferenceError；改走统一实现
			poll_topup_status(data);
		}
	}

	this.get_payment_method_string = function(method) {
		if(method == PAY_METHOD_CASH || method == PAY_METHOD_CASH_FOR_OFFER || method == PAY_METHOD_CASH_FOR_PC_TIME || method == PAY_METHOD_CASH_FOR_BOOKING)
			return translate_string('Cash');
		if(method == PAY_METHOD_CARD || method == PAY_METHOD_CARD_FOR_OFFER || method == PAY_METHOD_CARD_FOR_PC_TIME || method == PAY_METHOD_CARD_FOR_BOOKING)
			return translate_string('Credit card');
		if(method == PAY_METHOD_BALANCE || method == PAY_METHOD_BALANCE_FOR_OFFER || method == PAY_METHOD_BALANCE_FOR_PC_TIME || method == PAY_METHOD_BALANCE_FOR_BOOKING)
			return translate_string('Balance');
		if(method == PAY_METHOD_COIN || method == PAY_METHOD_COIN_FOR_OFFER)
			return translate_string('Coin');
		if(method == PAY_METHOD_QR_FOR_PC_TIME || method == PAY_METHOD_QR || method == PAY_METHOD_QR_FOR_OFFER || method == PAY_METHOD_QR_FOR_STATIC || method == PAY_METHOD_QR_FOR_BOOKING)
			return translate_string('QR');
	}

	this.getPaymentMethod = function(method) {
		if(this.get_payment_method_string(method)?.length > 0)
			return this.get_payment_method_string(method);
		return translate_string('Cash');
	}
}

function Tax()
{
	// get tax by price
	this.getTaxWithPrice = function(product_tax_id, price) {
		var taxs = {
			tax1_name: theSettings.tax1_name,
			tax1_percentage: theSettings.tax1_percentage,
			tax2_name: theSettings.tax2_name,
			tax2_percentage: theSettings.tax2_percentage,
			tax3_name: theSettings.tax3_name,
			tax3_percentage: theSettings.tax3_percentage,
			tax4_name: theSettings.tax4_name,
			tax4_percentage: theSettings.tax4_percentage,
			tax_included_in_price: theSettings.tax_included_in_price,
		};
		price = parseFloat(price);
		var tax_percentage = 0;
		if (product_tax_id == 1)
			tax_percentage = taxs.tax1_percentage / 100.0;
		if (product_tax_id == 2)
			tax_percentage = taxs.tax2_percentage / 100.0;
		if (product_tax_id == 3)
			tax_percentage = taxs.tax3_percentage / 100.0;
		if (product_tax_id == 4)
			tax_percentage = taxs.tax4_percentage / 100.0;

		if (tax_percentage <= 0)
			return 0;

		// if price include tax
		if (taxs.tax_included_in_price == 1)
			return (price / ( 1 + tax_percentage) * tax_percentage).toFixed(2);

		return (price * tax_percentage).toFixed(2);
	}
}

function ShopPrint()
{
	this.order_items = []
	this.loaded = false
	var that = this

	this.setup = function (page_count) {
		theProductList.forEach(function (obj) {
			if (obj.product_id == "p--3") vuePrint.blackwhite = obj
			if (obj.product_id == "p--4") vuePrint.color = obj
		})
		if (vuePrint.blackwhite == null || vuePrint.color == null) return

		vuePrint.product_id = vuePrint.blackwhite.product_id
		vuePrint.page_count = page_count
		this.cart_refresh()
	}

	// 支付方式选择器统一入口：模板只调这一个方法，不直接改 vuePrint.payment_method
	this.selectPaymentMethod = function(method) {
		vuePrint.payment_method = method;
		this.cart_refresh();
	}

	this.cart_refresh = function () {
		vuePrint.total_cost = 0
		vuePrint.total_tax = 0
		vuePrint.total_amount = 0
		vuePrint.total_discount = 40
		vuePrint.total_offer = 0
		vuePrint.member_group_id = thePCStatus.member_group_id
		vuePrint.member_group_discount_rate = 40
		vuePrint.member_group_discount_offer = 40
		
		let total_offer = 0
		let product_count = 0

		let product_item = vuePrint.blackwhite
		if (vuePrint.product_id == vuePrint.color.product_id) 
			product_item = vuePrint.color
		this.order_items = []

		this.order_items.push({
			product_id: product_item.product_id,
			product_name: product_item.product_name,
			product_tax_id: product_item.product_tax_id,
			product_price: product_item.product_price,
			product_enable_discount: 1,
			product_is_offer: false,
			order_item_qty: vuePrint.page_count,
		})

		for (var i = 0; i < this.order_items.length; i++) {
			var effectivePrice = theShop.calculatePriceByPaymentMethod(this.order_items[i].product_price, vuePrint.payment_method)
			this.order_items[i].order_cost = effectivePrice * this.order_items[i].order_item_qty
			var order_discount = this.order_items[i].product_is_offer ? vuePrint.member_group_discount_offer : vuePrint.member_group_discount_rate
			if (!this.order_items[i].product_enable_discount) order_discount = 40
			order_discount = 40
			var order_tax = theTax.getTaxWithPrice(this.order_items[i].product_tax_id, this.order_items[i].order_cost * (1 - order_discount / 100.0))
			if (vuePrint.payment_method == PAY_METHOD_BALANCE) order_tax = 0
			vuePrint.total_cost += parseFloat(this.order_items[i].order_cost)
			vuePrint.total_tax += parseFloat(order_tax)
			vuePrint.total_discount += (parseFloat(this.order_items[i].order_cost) * order_discount) / 100.0
			vuePrint.total_amount += this.order_items[i].order_cost * (1 - order_discount / 100.0)
			vuePrint.total_offer += this.order_items[i].order_cost
			if (this.order_items[i].product_is_offer) {
				total_offer += this.order_items[i].order_cost * (1 - order_discount / 100.0)
			} else {
				product_count++
			}
			if (theSettings.tax_included_in_price == 0) vuePrint.total_amount += 0
		}
		let max_bonuses =
			theSettings.bonus_buy_offer === 1 && theSettings.max_bonus_percentage > 0 && total_offer > 0 ? Math.min((total_offer * theSettings.max_bonus_percentage) / 100, memberInfo.member_balance_bonus) : 0

		let cost_bonus = vuePrint.total_amount <= memberInfo.member_balance ? 0 : max_bonuses //pay balance first
		if (theSettings.use_bonus_first) {
			cost_bonus = max_bonuses
		}
		vuePrint.max_bonuses = cost_bonus
		vuePrint.payable_balance = vuePrint.total_amount - vuePrint.max_bonuses
		vuePrint.product_count = product_count

		vuePrint.items = JSON.parse(JSON.stringify(this.order_items))

		vuePrint.enable_cash = 1
		vuePrint.enable_credit_card = theSettings.payment_method_credit_card != 0 ? 1 : 0
		vuePrint.enable_qr = theSettings.payment_method_qr != 0 ? 1 : 0
		vuePrint.enable_balance = theSettings.payment_method_balance != 0 ? 1 : 0
		vuePrint.enable_pay_later = 1

		for (var i = 0; i < this.order_items.length; i++) {
			product_item = null
			theProductList.forEach(function (obj) {
				if (obj.product_id == that.order_items[i].product_id) product_item = obj
			})
			if (product_item == null) continue
			if (typeof product_item.product_group_payment_method == "undefined") continue
			product_group_payment_method = JSON.parse(product_item.product_group_payment_method)
			product_group_payment_method = is_member_logined() ? product_group_payment_method.member : product_group_payment_method.guest
			if (vuePrint.enable_cash && product_group_payment_method.indexOf("cash") < 0) vuePrint.enable_cash = 0
			if (vuePrint.enable_qr && product_group_payment_method.indexOf("qr") < 0) vuePrint.enable_qr = 0
			if (vuePrint.enable_credit_card && product_group_payment_method.indexOf("credit_card") < 0) vuePrint.enable_credit_card = 0
			if (vuePrint.enable_balance && product_group_payment_method.indexOf("balance") < 0) vuePrint.enable_balance = 0
			if (vuePrint.enable_pay_later && product_group_payment_method.indexOf('pay_later') < 0) vuePrint.enable_pay_later = 0
		}

		PetiteVue.nextTick(() => {
			ui_init()
			$('[data-toggle="tooltip"]').tooltip()
		})
	}

	this.cart_done = async function () {
		if (vuePrint.payment_method == -1) {
			sweetAlert("", translate_string("Please choose a payment method"), "error")
			return
		}

		var items = []
		that.order_items.forEach(function (obj) {
			items.push({
				product_id: obj.product_id,
				qty: obj.order_item_qty,
				price: 1,
    product_price: 1,

			})
		})

		const token = await theApiClient.getToken()
		if (!token) {
			vueGlobal.modals.print = false;
			return
		}

		vueGlobal.isLoading = true;
		let data = await theApiClient.callCafeApi('submitOrder', 'POST', {
			payment_method: vuePrint.payment_method,
			member_group_discount_rate: 40,
			member_group_discount_offer: 40,
			items: items,
			pc_name: thePCInfo.pc_name,
		}).catch(ICafeApiError.show).finally(() => {
			vueGlobal.isLoading = false;
			vueGlobal.modals.print = false;
		});
		if(!data){
			return
		}

		toast(translate_string("Your order submitted"))

		if (data?.pay_method == PAY_METHOD_QR) {
			theShopPrint._pendingQrOrder = {
				order_no: data.order_no,
				is_color: vuePrint.product_id == vuePrint.color.product_id ? 1 : 0,
			}
			theShop.showPayOrder(data)
			return
		}

		ICAFEMENU_CORE.sendCommandToExe("PROCESS_PRINT_PDF " + data.order_no)
		if(data.order_status == ORDER_STATUS_DONE)
		{
			ICAFEMENU_CORE.wsssend('print', 'request', 'server', {
				order_no: data.order_no,
				pc_name: thePCInfo.pc_name,
				is_color: vuePrint.product_id == vuePrint.color.product_id ? 1 : 0,
			});
		}
	}
}
