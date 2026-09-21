import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Diner-facing languages. Menu text (dish/category/option names) comes from each row's
 * `i18n` column; the fixed interface strings below are ours.
 * Khmer and Chinese strings should get a native-speaker review before a big launch.
 */
export type Lang = 'en' | 'km' | 'zh';

export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'km', label: 'ខ្មែរ', short: 'ខ្មែរ' },
  { id: 'zh', label: '中文', short: '中文' },
];

const STRINGS = {
  searchDishes: { en: 'Search dishes', km: 'ស្វែងរកម្ហូប', zh: '搜索菜品' },
  chefsPicks: { en: 'Chef’s picks', km: 'ម្ហូបណែនាំ', zh: '主厨推荐' },
  popular: { en: 'Popular', km: 'ពេញនិយម', zh: '热门' },
  chefsPick: { en: 'Chef’s pick', km: 'ណែនាំ', zh: '推荐' },
  soldOut: { en: 'Sold out today', km: 'អស់ហើយថ្ងៃនេះ', zh: '今日售罄' },
  noMatch: { en: 'No dishes match', km: 'រកមិនឃើញម្ហូប', zh: '没有找到菜品' },
  orderFromPhone: { en: 'Order from your phone · pay at the counter', km: 'កុម្ម៉ង់ពីទូរស័ព្ទ · បង់ប្រាក់នៅបញ្ជរ', zh: '用手机点餐 · 前台结账' },
  orderWithStaff: { en: 'Please order with our staff', km: 'សូមកុម្ម៉ង់ជាមួយបុគ្គលិក', zh: '请向服务员点餐' },
  bill: { en: 'Bill', km: 'វិក្កយបត្រ', zh: '账单' },
  addDishes: { en: 'Add dishes to order', km: 'ជ្រើសម្ហូបដើម្បីកុម្ម៉ង់', zh: '请选择菜品' },
  viewOrder: { en: 'View order', km: 'មើលការកុម្ម៉ង់', zh: '查看订单' },
  added: { en: 'added', km: 'បានបន្ថែម', zh: '已添加' },
  specialRequests: { en: 'Special requests', km: 'សំណើពិសេស', zh: '特殊要求' },
  specialPlaceholder: { en: 'e.g. no chilli, no peanuts', km: 'ឧ. កុំដាក់ម្ទេស កុំដាក់សណ្តែកដី', zh: '例如：不要辣、不要花生' },
  scanToOrder: { en: 'To order, scan the QR code on your table or ask our staff.', km: 'ដើម្បីកុម្ម៉ង់ សូមស្កេន QR នៅលើតុ ឬសួរបុគ្គលិក។', zh: '如需点餐，请扫描桌上的二维码或询问服务员。' },
  add: { en: 'Add', km: 'បន្ថែម', zh: '加入' },
  remove: { en: 'Remove', km: 'ដកចេញ', zh: '减少' },
  required: { en: 'Required', km: 'ត្រូវជ្រើស', zh: '必选' },
  optional: { en: 'Optional', km: 'មិនចាំបាច់', zh: '可选' },
  chooseAny: { en: 'Choose any', km: 'ជ្រើសបានច្រើន', zh: '可多选' },
  pickRequired: { en: 'Please choose', km: 'សូមជ្រើស', zh: '请选择' },
  yourOrder: { en: 'Your order', km: 'ការកុម្ម៉ង់របស់អ្នក', zh: '您的订单' },
  kitchenStarts: { en: 'the kitchen starts as soon as you send it', km: 'ផ្ទះបាយចាប់ផ្តើមភ្លាមៗពេលអ្នកផ្ញើ', zh: '发送后厨房立即开始准备' },
  total: { en: 'Total', km: 'សរុប', zh: '合计' },
  send: { en: 'Send order to kitchen', km: 'ផ្ញើទៅផ្ទះបាយ', zh: '发送到厨房' },
  sending: { en: 'Sending…', km: 'កំពុងផ្ញើ…', zh: '发送中…' },
  payAtCounter: { en: 'You pay at the counter when you’re done.', km: 'បង់ប្រាក់នៅបញ្ជរពេលញ៉ាំរួច។', zh: '用餐后请到前台结账。' },
  emptyOrder: { en: 'Your order is empty.', km: 'មិនទាន់មានម្ហូបទេ។', zh: '订单为空。' },
  yourName: { en: 'Your name', km: 'ឈ្មោះរបស់អ្នក', zh: '您的名字' },
  nameHint: { en: '(optional, for splitting the bill)', km: '(មិនចាំបាច់ សម្រាប់ចែកវិក្កយបត្រ)', zh: '（可选，用于分账）' },
  kitchenNote: { en: 'Note for the kitchen', km: 'កំណត់សម្គាល់សម្រាប់ផ្ទះបាយ', zh: '给厨房的备注' },
  optionalParen: { en: '(optional)', km: '(មិនចាំបាច់)', zh: '（可选）' },
  notePlaceholder: { en: 'e.g. bring drinks first', km: 'ឧ. យកភេសជ្ជៈមកមុន', zh: '例如：先上饮料' },
  orderSent: { en: 'Order #{n} sent to the kitchen!', km: 'ការកុម្ម៉ង់ #{n} បានផ្ញើទៅផ្ទះបាយ!', zh: '订单 #{n} 已发送到厨房！' },
  removeSoldOut: { en: 'Sold out, please remove', km: 'អស់ហើយ សូមដកចេញ', zh: '已售罄，请删除' },
  removeGone: { en: 'No longer on the menu, please remove', km: 'លែងមានក្នុងម៉ឺនុយ សូមដកចេញ', zh: '菜单已下架，请删除' },
  tableBill: { en: '{table} · bill', km: '{table} · វិក្កយបត្រ', zh: '{table} · 账单' },
  everyoneOrders: {
    en: 'Everyone at this table can order from their own phone. It all adds up here.',
    km: 'អ្នកទាំងអស់នៅតុនេះអាចកុម្ម៉ង់ពីទូរស័ព្ទរៀងៗខ្លួន ហើយបូកសរុបនៅទីនេះ។',
    zh: '同桌每个人都可以用自己的手机点餐，费用都汇总在这里。',
  },
  tableTotal: { en: 'Table total', km: 'សរុបតុ', zh: '本桌合计' },
  callWaiter: { en: 'Call waiter', km: 'ហៅអ្នករត់តុ', zh: '呼叫服务员' },
  askBill: { en: 'Ask for bill', km: 'សុំគិតលុយ', zh: '请求结账' },
  billRequested: { en: 'Bill requested. Staff will bring it shortly.', km: 'បានសុំគិតលុយ។ បុគ្គលិកនឹងយកមកឆាប់ៗ។', zh: '已请求结账，服务员马上就来。' },
  waiterComing: { en: 'A staff member is on the way.', km: 'បុគ្គលិកកំពុងមក។', zh: '服务员马上就到。' },
  loading: { en: 'Loading…', km: 'កំពុងផ្ទុក…', zh: '加载中…' },
  noOrders: { en: 'No orders yet.', km: 'មិនទាន់មានការកុម្ម៉ង់ទេ។', zh: '还没有订单。' },
  orders: { en: 'Orders', km: 'ការកុម្ម៉ង់', zh: '订单' },
  byPerson: { en: 'By person', km: 'តាមមនុស្ស', zh: '按人分' },
  equally: { en: 'Split equally', km: 'ចែកស្មើ', zh: '平均分' },
  nameTip: {
    en: 'Tip: type your name when you send an order and the bill splits itself by person.',
    km: 'គន្លឹះ៖ វាយឈ្មោះរបស់អ្នកពេលផ្ញើការកុម្ម៉ង់ ដើម្បីចែកវិក្កយបត្រតាមមនុស្ស។',
    zh: '提示：下单时填写名字，账单会自动按人拆分。',
  },
  howMany: { en: 'How many people?', km: 'ចំនួនប៉ុន្មាននាក់?', zh: '几个人？' },
  eachPays: { en: 'Each person pays', km: 'ម្នាក់ៗបង់', zh: '每人支付' },
  someMore: { en: '{n} pay {amt} so it adds up exactly', km: '{n} នាក់បង់ {amt} ដើម្បីឲ្យត្រូវចំនួន', zh: '其中 {n} 人支付 {amt}，以便金额正好' },
  order: { en: 'Order', km: 'ការកុម្ម៉ង់', zh: '订单' },
  guest: { en: 'Guest', km: 'ភ្ញៀវ', zh: '客人' },
  rielRate: { en: 'Riel prices at {rate}៛ = $1', km: 'តម្លៃរៀល {rate}៛ = $1', zh: '瑞尔价格按 {rate}៛ = $1 计算' },
  poweredBy: { en: 'Powered by', km: 'ដំណើរការដោយ', zh: '技术支持' },
  status_new: { en: 'Sent to kitchen', km: 'បានផ្ញើទៅផ្ទះបាយ', zh: '已发送到厨房' },
  status_preparing: { en: 'Preparing', km: 'កំពុងរៀបចំ', zh: '准备中' },
  status_served: { en: 'Served', km: 'បានបម្រើ', zh: '已上菜' },
  status_cancelled: { en: 'Cancelled', km: 'បានលុបចោល', zh: '已取消' },

  // ---- Staff app (src/pages/admin). Keys start with s_. ----
  s_tabToday: { en: 'Today', km: 'ថ្ងៃនេះ', zh: '今日' },
  s_tabMenu: { en: 'Menu', km: 'ម៉ឺនុយ', zh: '菜单' },
  s_tabTables: { en: 'Tables & QR', km: 'តុ & QR', zh: '餐桌二维码' },
  s_tabSettings: { en: 'Settings', km: 'ការកំណត់', zh: '设置' },
  s_language: { en: 'Language', km: 'ភាសា', zh: '语言' },
  s_signInTitle: { en: 'Staff sign in', km: 'ចូលសម្រាប់បុគ្គលិក', zh: '员工登录' },
  s_signInIntro: { en: 'Orders, menu and table QR codes for your restaurant.', km: 'ការកុម្ម៉ង់ ម៉ឺនុយ និង QR តុ សម្រាប់ហាងរបស់អ្នក។', zh: '管理餐厅的订单、菜单和餐桌二维码。' },
  s_email: { en: 'Email', km: 'អ៊ីមែល', zh: '邮箱' },
  s_password: { en: 'Password', km: 'ពាក្យសម្ងាត់', zh: '密码' },
  s_wrongLogin: { en: 'Wrong email or password.', km: 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។', zh: '邮箱或密码错误。' },
  s_signingIn: { en: 'Signing in…', km: 'កំពុងចូល…', zh: '登录中…' },
  s_signIn: { en: 'Sign in', km: 'ចូល', zh: '登录' },
  s_backHome: { en: '← Back to KhMenu', km: '← ត្រឡប់ទៅ KhMenu', zh: '← 返回 KhMenu' },
  s_noRestaurant: { en: 'No restaurant linked', km: 'មិនទាន់ភ្ជាប់ហាង', zh: '未关联餐厅' },
  s_noRestaurantBody: {
    en: 'This account isn’t linked to a restaurant yet. Contact KhMenu support.',
    km: 'គណនីនេះមិនទាន់ភ្ជាប់ជាមួយហាងណាមួយទេ។ សូមទាក់ទងក្រុមការងារ KhMenu។',
    zh: '此账号尚未关联餐厅，请联系 KhMenu 客服。',
  },
  s_signOut: { en: 'Sign out', km: 'ចាកចេញ', zh: '退出' },
  s_viewMenu: { en: 'View menu', km: 'មើលម៉ឺនុយ', zh: '查看菜单' },

  // Orders board
  s_aTable: { en: 'A table', km: 'តុមួយ', zh: '某桌' },
  s_noTable: { en: 'No table', km: 'គ្មានតុ', zh: '无桌号' },
  s_newOrderToast: { en: 'New order #{n} · {table}', km: 'កុម្ម៉ង់ថ្មី #{n} · {table}', zh: '新订单 #{n} · {table}' },
  s_askedBillToast: { en: '{table} asked for the bill', km: '{table} សុំគិតលុយ', zh: '{table}要结账' },
  s_callingToast: { en: '{table} is calling a waiter', km: '{table} កំពុងហៅអ្នករត់តុ', zh: '{table}在呼叫服务员' },
  s_wantsBillLine: { en: '{table} wants the bill', km: '{table} សុំគិតលុយ', zh: '{table}要结账' },
  s_confirmCancel: { en: 'Cancel order #{n}?', km: 'លុបចោលកុម្ម៉ង់ #{n} មែនទេ?', zh: '确定取消订单 #{n}？' },
  s_alreadyUpdated: { en: 'Order #{n} was already updated on another device', km: 'កុម្ម៉ង់ #{n} ត្រូវបានកែរួចហើយលើឧបករណ៍ផ្សេង', zh: '订单 #{n} 已在其他设备上更新' },
  s_confirmClose: {
    en: 'Mark {table} as paid ({amt}) and clear it for the next guests?',
    km: '{table} បង់ប្រាក់រួច ({amt}) ហើយសម្អាតតុសម្រាប់ភ្ញៀវបន្ទាប់មែនទេ?',
    zh: '确认{table}已付款（{amt}）并清台给下一桌客人？',
  },
  s_alreadyClosed: { en: '{table} was already closed on another device', km: '{table} ត្រូវបានបិទរួចហើយលើឧបករណ៍ផ្សេង', zh: '{table}已在其他设备上结账' },
  s_paidButNew: {
    en: '{table}: paid {amt}, but a new order just came in, so the table stays open',
    km: '{table}៖ បានបង់ {amt} ប៉ុន្តែមានកុម្ម៉ង់ថ្មីទើបចូល ដូច្នេះតុនៅបើកដដែល',
    zh: '{table}：已付 {amt}，但刚有新订单，餐桌保持开启',
  },
  s_tableClosed: { en: '{table} closed · {amt}', km: 'បិទ {table} · {amt}', zh: '{table}已结账 · {amt}' },
  s_live: { en: 'Live', km: 'អនឡាញ', zh: '实时' },
  s_connecting: { en: 'Connecting…', km: 'កំពុងភ្ជាប់…', zh: '连接中…' },
  s_alertsOnNote: { en: 'Sound on · screen stays awake · keep this tab open', km: 'បើកសំឡេង · អេក្រង់មិនបិទ · សូមទុកទំព័រនេះបើក', zh: '声音已开 · 屏幕常亮 · 请保持此页面打开' },
  s_turnOnAlerts: { en: 'Turn on order alerts', km: 'បើកសំឡេងរោទ៍កុម្ម៉ង់', zh: '开启订单提醒' },
  s_tables: { en: 'Tables', km: 'តុ', zh: '餐桌' },
  s_tablesHint: { en: 'Tap a table to seat, move or clear it', km: 'ចុចលើតុ ដើម្បីដាក់ភ្ញៀវ ប្ដូរ ឬបិទតុ', zh: '点餐桌可入座、换桌或清台' },
  s_seated: { en: 'Seated', km: 'មានភ្ញៀវ', zh: '已入座' },
  s_guestsCount: { en: '{n} guests', km: 'ភ្ញៀវ {n} នាក់', zh: '{n} 位客人' },
  s_more: { en: 'More', km: 'ច្រើនទៀត', zh: '更多' },
  s_back: { en: 'Back', km: 'ត្រឡប់', zh: '返回' },
  s_combine: { en: 'Combine with another table', km: 'ផ្គុំជាមួយតុផ្សេង', zh: '与其他桌合并' },
  s_combineWith: { en: 'Combine {table} with…', km: 'ផ្គុំ {table} ជាមួយ…', zh: '将{table}并入…' },
  s_combined: { en: '{table} combined with {into}', km: 'បានផ្គុំ {table} ជាមួយ {into}', zh: '{table}已并入{into}' },
  s_joinedWith: { en: 'With {table}', km: 'រួមជាមួយ {table}', zh: '并入{table}' },
  s_joinedHint: {
    en: 'Orders and calls from this table go to {table}.',
    km: 'ការកុម្ម៉ង់ និងការហៅពីតុនេះ ទៅកាន់ {table}។',
    zh: '此桌的点单和呼叫都会记到{table}。',
  },
  s_separate: { en: 'Separate tables', km: 'បំបែកតុ', zh: '拆开餐桌' },
  s_move: { en: 'Move to another table', km: 'ប្ដូរទៅតុផ្សេង', zh: '换桌' },
  s_moveTo: { en: 'Move {table} to…', km: 'ប្ដូរ {table} ទៅ…', zh: '将{table}换到…' },
  s_moved: {
    en: 'Moved {from} → {to}. Ask the guests to scan the QR on {to}.',
    km: 'បានប្ដូរ {from} → {to}។ សូមប្រាប់ភ្ញៀវស្កេន QR នៅ {to}។',
    zh: '已从{from}换到{to}。请让客人扫描{to}的二维码。',
  },
  s_clearPaid: { en: 'Paid · clear table ({amt})', km: 'បង់រួច · បិទតុ ({amt})', zh: '已付款 · 清台（{amt}）' },
  s_clearLeft: { en: 'Guests left · clear table', km: 'ភ្ញៀវចេញហើយ · បិទតុ', zh: '客人已离开 · 清台' },
  s_changeGuests: { en: 'Change number of guests', km: 'ប្ដូរចំនួនភ្ញៀវ', zh: '修改人数' },
  s_noFreeTables: { en: 'No free tables right now', km: 'មិនមានតុទំនេរទេ', zh: '现在没有空桌' },
  s_noBusyTables: { en: 'No tables with guests to combine with', km: 'មិនមានតុមានភ្ញៀវ ដើម្បីផ្គុំ', zh: '没有可合并的有客餐桌' },
  s_tableChanged: { en: '{table} was already changed on another device', km: '{table} ត្រូវបានកែរួចហើយលើឧបករណ៍ផ្សេង', zh: '{table}已在其他设备上更改' },
  s_tableNotFree: { en: 'That table is no longer free', km: 'តុនោះលែងទំនេរហើយ', zh: '该桌已不再空闲' },
  s_downloadCsv: { en: 'Download CSV', km: 'ទាញយក CSV', zh: '下载 CSV' },
  s_unavailable: { en: 'Unavailable', km: 'មិនអាចប្រើ', zh: '不可用' },
  s_markUnavailable: { en: 'Mark table unavailable', km: 'កំណត់តុមិនអាចប្រើ', zh: '设为不可用' },
  s_unavailableReason: { en: 'Reason (optional), e.g. broken, reserved', km: 'មូលហេតុ (មិនចាំបាច់) ឧ. ខូច កក់ទុក', zh: '原因（可选），如：损坏、已预订' },
  s_makeAvailable: { en: 'Make available again', km: 'ធ្វើឲ្យប្រើបានវិញ', zh: '恢复可用' },
  s_wantsBill: { en: 'Wants bill', km: 'សុំគិតលុយ', zh: '要结账' },
  s_calling: { en: 'Calling', km: 'កំពុងហៅ', zh: '呼叫中' },
  s_free: { en: 'Free', km: 'ទំនេរ', zh: '空闲' },
  s_done: { en: 'Done', km: 'រួចរាល់', zh: '完成' },
  s_colNew: { en: 'New', km: 'ថ្មី', zh: '新订单' },
  s_nothingHere: { en: 'Nothing here.', km: 'មិនមានទេ។', zh: '暂无。' },
  s_cancel: { en: 'Cancel', km: 'លុបចោល', zh: '取消' },
  s_startCooking: { en: 'Start cooking', km: 'ចាប់ផ្ដើមធ្វើ', zh: '开始做' },
  s_openBills: { en: 'Open bills', km: 'វិក្កយបត្រមិនទាន់បង់', zh: '未结账单' },
  s_noOpenBills: { en: 'No unpaid tables.', km: 'គ្មានតុមិនទាន់បង់ទេ។', zh: '没有未结账的餐桌。' },
  s_billOrders1: { en: '{n} order · since {time}', km: '{n} កុម្ម៉ង់ · តាំងពី {time}', zh: '{n} 个订单 · {time}开始' },
  s_billOrdersN: { en: '{n} orders · since {time}', km: '{n} កុម្ម៉ង់ · តាំងពី {time}', zh: '{n} 个订单 · {time}开始' },
  s_paidClose: { en: 'Paid, close bill', km: 'បង់រួច បិទវិក្កយបត្រ', zh: '已付款，结账' },
  s_boardTip: {
    en: 'Tip: open this page on a tablet at the counter or in the kitchen. Any phone signed in here gets the same live orders.',
    km: 'គន្លឹះ៖ បើកទំព័រនេះលើថេប្លេតនៅបញ្ជរ ឬក្នុងផ្ទះបាយ។ ទូរស័ព្ទណាដែលចូលគណនីនេះ នឹងឃើញការកុម្ម៉ង់ដូចគ្នាភ្លាមៗ។',
    zh: '提示：可在前台或厨房的平板上打开此页面。登录此账号的任何手机都会看到相同的实时订单。',
  },
  s_justNow: { en: 'just now', km: 'អម្បាញ់មិញ', zh: '刚刚' },
  s_minAgo: { en: '{n} min ago', km: '{n} នាទីមុន', zh: '{n} 分钟前' },
  s_hoursAgo: { en: '{h}h {m}m ago', km: '{h}ម៉ោង {m}នាទីមុន', zh: '{h}小时{m}分钟前' },

  // Device setup (notifications / install)
  s_pushOnTest: { en: 'Notifications on. A test alert was sent.', km: 'បានបើកការជូនដំណឹង។ បានផ្ញើសារសាកល្បង។', zh: '通知已开启，已发送测试提醒。' },
  s_pushOn: { en: 'Notifications on for this device.', km: 'បានបើកការជូនដំណឹងលើឧបករណ៍នេះ។', zh: '此设备已开启通知。' },
  s_pushOff: { en: 'Notifications off for this device', km: 'បានបិទការជូនដំណឹងលើឧបករណ៍នេះ', zh: '此设备已关闭通知' },
  s_iosTitle: { en: 'Install the staff app on this iPhone', km: 'ដំឡើងកម្មវិធីបុគ្គលិកលើ iPhone នេះ', zh: '在这部 iPhone 上安装员工应用' },
  // {share}, {add} and {app} are swapped for bold labels (and the Share icon) in DeviceSetup.
  s_iosSteps: {
    en: 'Tap {share} in Safari, then {add}. Open {app} from your home screen, sign in, and turn on notifications.',
    km: 'ចុច {share} ក្នុង Safari រួចចុច {add}។ បើក {app} ពីអេក្រង់ដើម ចូលគណនី ហើយបើកការជូនដំណឹង។',
    zh: '在 Safari 中点 {share}，然后选 {add}。从主屏幕打开 {app}，登录并开启通知。',
  },
  // iOS has no Khmer interface, so Khmer keeps the English button names staff actually see.
  s_iosShare: { en: 'Share', km: 'Share', zh: '共享' },
  s_iosAdd: { en: 'Add to Home Screen', km: 'Add to Home Screen', zh: '添加到主屏幕' },
  s_noPushTitle: { en: 'This browser can’t show notifications', km: 'កម្មវិធីរុករកនេះមិនអាចបង្ហាញការជូនដំណឹងបានទេ', zh: '此浏览器无法显示通知' },
  s_noPushBody: {
    en: 'Use Chrome on Android or a computer, or the installed app on iPhone. Orders still appear here live with a sound.',
    km: 'សូមប្រើ Chrome លើ Android ឬកុំព្យូទ័រ ឬកម្មវិធីដែលបានដំឡើងលើ iPhone។ ការកុម្ម៉ង់នៅតែបង្ហាញនៅទីនេះភ្លាមៗ ជាមួយសំឡេង។',
    zh: '请在安卓手机或电脑上使用 Chrome，或在 iPhone 上使用已安装的应用。订单仍会在此实时显示并响铃。',
  },
  s_pushIsOn: { en: 'Notifications are on for this device', km: 'ការជូនដំណឹងបានបើកលើឧបករណ៍នេះ', zh: '此设备已开启通知' },
  s_testSent: { en: 'Test alert sent', km: 'បានផ្ញើសារសាកល្បង', zh: '测试提醒已发送' },
  s_sendTest: { en: 'Send test', km: 'ផ្ញើសាកល្បង', zh: '发送测试' },
  s_turnOff: { en: 'Turn off', km: 'បិទ', zh: '关闭' },
  s_pushCardTitle: { en: 'Get an alert for every order, even when the app is closed', km: 'ទទួលការជូនដំណឹងរាល់កុម្ម៉ង់ ទោះបិទកម្មវិធីក៏ដោយ', zh: '每个订单都会提醒，即使应用已关闭' },
  s_pushCardBody: {
    en: 'Turn this on for each phone or tablet that should ring: the counter tablet, the kitchen, waiters’ phones.',
    km: 'បើកលើទូរស័ព្ទ ឬថេប្លេតនីមួយៗដែលត្រូវរោទ៍៖ ថេប្លេតនៅបញ្ជរ ផ្ទះបាយ និងទូរស័ព្ទអ្នករត់តុ។',
    zh: '在每台需要响铃的手机或平板上开启：前台平板、厨房、服务员手机。',
  },
  s_turningOn: { en: 'Turning on…', km: 'កំពុងបើក…', zh: '开启中…' },
  s_turnOnPush: { en: 'Turn on notifications', km: 'បើកការជូនដំណឹង', zh: '开启通知' },
  s_installApp: { en: 'Install app', km: 'ដំឡើងកម្មវិធី', zh: '安装应用' },

  // Tables & QR
  s_tableAdded: { en: '{table} added', km: 'បានបន្ថែម {table}', zh: '已添加{table}' },
  s_renamePrompt: { en: 'Table name (shown to diners and on orders)', km: 'ឈ្មោះតុ (បង្ហាញដល់ភ្ញៀវ និងលើការកុម្ម៉ង់)', zh: '桌名（顾客和订单上都会显示）' },
  s_confirmNewQr: {
    en: 'Make a new QR code for {table}? The old printed code will stop working.',
    km: 'បង្កើត QR ថ្មីសម្រាប់ {table} មែនទេ? QR ចាស់ដែលបានបោះពុម្ពនឹងលែងប្រើបាន។',
    zh: '为{table}生成新二维码？旧的打印二维码将失效。',
  },
  s_newQrMade: { en: 'New QR code made. Print it again.', km: 'បានបង្កើត QR ថ្មី។ សូមបោះពុម្ពម្ដងទៀត។', zh: '已生成新二维码，请重新打印。' },
  s_confirmDeleteTable: {
    en: 'Delete {table}? Its QR code will stop working. Past orders are kept.',
    km: 'លុប {table} មែនទេ? QR របស់តុនេះនឹងលែងប្រើបាន។ ការកុម្ម៉ង់ចាស់ៗនៅរក្សាទុក។',
    zh: '删除{table}？其二维码将失效，历史订单会保留。',
  },
  s_tableDeleted: { en: '{table} deleted', km: 'បានលុប {table}', zh: '已删除{table}' },
  s_tableQrCodes: { en: 'Table QR codes', km: 'QR តាមតុ', zh: '餐桌二维码' },
  s_tableQrIntro: {
    en: 'Stick one on each table. Scanning opens the menu with ordering turned on for that table. People can only order after scanning a table code.',
    km: 'បិទមួយនៅលើតុនីមួយៗ។ ពេលស្កេន ម៉ឺនុយនឹងបើក ហើយអាចកុម្ម៉ង់សម្រាប់តុនោះបាន។ ភ្ញៀវអាចកុម្ម៉ង់បាន លុះត្រាតែស្កេន QR របស់តុ។',
    zh: '每张桌子贴一张。扫码即可打开该桌的菜单并点餐。顾客必须扫描桌上的二维码才能点餐。',
  },
  s_addTable: { en: 'Add table', km: 'បន្ថែមតុ', zh: '添加餐桌' },
  s_printAll: { en: 'Print all', km: 'បោះពុម្ពទាំងអស់', zh: '全部打印' },
  s_publicQrAlt: { en: 'QR code for the public menu', km: 'QR សម្រាប់ម៉ឺនុយសាធារណៈ', zh: '公开菜单二维码' },
  s_publicLink: { en: 'Public menu link', km: 'តំណម៉ឺនុយសាធារណៈ', zh: '公开菜单链接' },
  s_publicIntro: {
    en: 'View only, no ordering. Put it on Google Maps, Facebook, Instagram, Telegram and your front door.',
    km: 'សម្រាប់មើលប៉ុណ្ណោះ មិនអាចកុម្ម៉ង់បានទេ។ ដាក់វានៅលើ Google Maps, Facebook, Instagram, Telegram និងនៅមុខហាង។',
    zh: '仅供浏览，不能点餐。可放在 Google 地图、Facebook、Instagram、Telegram 和店门口。',
  },
  s_linkCopied: { en: 'Link copied', km: 'បានចម្លងតំណ', zh: '链接已复制' },
  s_copyLink: { en: 'Copy link', km: 'ចម្លងតំណ', zh: '复制链接' },
  s_downloadQr: { en: 'Download QR', km: 'ទាញយក QR', zh: '下载二维码' },
  s_open: { en: 'Open', km: 'បើក', zh: '打开' },
  s_downloadPng: { en: 'Download PNG', km: 'ទាញយក PNG', zh: '下载 PNG' },
  s_rename: { en: 'Rename', km: 'ប្ដូរឈ្មោះ', zh: '重命名' },
  s_newCode: { en: 'Make a new code', km: 'បង្កើត QR ថ្មី', zh: '生成新码' },
  s_delete: { en: 'Delete', km: 'លុប', zh: '删除' },

  // Menu editor & options
  s_presetSugar: { en: 'Sugar level', km: 'កម្រិតស្ករ', zh: '甜度' },
  s_presetIce: { en: 'Ice level', km: 'កម្រិតទឹកកក', zh: '冰量' },
  s_presetSize: { en: 'Size', km: 'ទំហំ', zh: '份量' },
  s_presetSpice: { en: 'Spice level', km: 'កម្រិតហឹរ', zh: '辣度' },
  s_presetAddons: { en: 'Add-ons', km: 'គ្រឿងបន្ថែម', zh: '加料' },
  s_options: { en: 'Options', km: 'ជម្រើស', zh: '选项' },
  s_custom: { en: 'Custom', km: 'ផ្ទាល់ខ្លួន', zh: '自定义' },
  s_noOptions: {
    en: 'No options. Add sugar level, size or add-ons if diners should choose.',
    km: 'គ្មានជម្រើស។ បន្ថែមកម្រិតស្ករ ទំហំ ឬគ្រឿងបន្ថែម បើភ្ញៀវត្រូវជ្រើស។',
    zh: '无选项。如需顾客选择，可添加甜度、份量或加料。',
  },
  // Names typed here are the English base text the kitchen sees, so the examples stay English.
  s_groupPlaceholder: { en: 'Group name, e.g. Sugar level', km: 'ឈ្មោះក្រុម ឧ. Sugar level', zh: '组名，例如 Sugar level' },
  s_choicePlaceholder: { en: 'Choice, e.g. Less sugar', km: 'ជម្រើស ឧ. Less sugar', zh: '选项，例如 Less sugar' },
  s_removeGroup: { en: 'Remove group', km: 'លុបក្រុម', zh: '删除组' },
  s_mustChoose: { en: 'Diner must choose', km: 'ភ្ញៀវត្រូវជ្រើស', zh: '顾客必选' },
  s_canPickSeveral: { en: 'Can pick several', km: 'ជ្រើសបានច្រើន', zh: '可多选' },
  s_removeChoice: { en: 'Remove choice', km: 'លុបជម្រើស', zh: '删除选项' },
  s_addChoice: { en: 'Add choice', km: 'បន្ថែមជម្រើស', zh: '添加选项' },
  s_moveDishesFirst: { en: 'Move or delete the dishes in “{name}” first.', km: 'សូមផ្លាស់ទី ឬលុបម្ហូបក្នុង “{name}” ជាមុនសិន។', zh: '请先移走或删除“{name}”中的菜品。' },
  s_confirmDeleteCat: { en: 'Delete category “{name}”?', km: 'លុបប្រភេទ “{name}” មែនទេ?', zh: '删除分类“{name}”？' },
  s_backOn: { en: '{name} is back on', km: '{name} មានលក់វិញហើយ', zh: '{name}已恢复供应' },
  s_markedSoldOut: { en: '{name} marked sold out', km: '{name} អស់ហើយ', zh: '{name}已标记售罄' },
  s_menuIntro: {
    en: 'Flip the switch to mark a dish sold out. Diners’ phones update within a minute.',
    km: 'បិទកុងតាក់ ដើម្បីដាក់ម្ហូបថាអស់។ ទូរស័ព្ទភ្ញៀវនឹងប្ដូរតាមក្នុងរយៈពេលមួយនាទី។',
    zh: '关闭开关即可将菜品标为售罄，顾客手机一分钟内更新。',
  },
  s_reportGroupHint: { en: 'Counts toward this group in the daily report', km: 'រាប់ចូលក្រុមនេះក្នុងរបាយការណ៍ប្រចាំថ្ងៃ', zh: '在日报中计入此类' },
  s_grpStarter: { en: 'Appetizers', km: 'អាហារសម្រន់', zh: '前菜' },
  s_grpMain: { en: 'Mains', km: 'ម្ហូបចម្បង', zh: '主菜' },
  s_grpDrink: { en: 'Drinks', km: 'ភេសជ្ជៈ', zh: '饮品' },
  s_grpDessert: { en: 'Desserts', km: 'បង្អែម', zh: '甜品' },
  s_grpOther: { en: 'Other', km: 'ផ្សេងៗ', zh: '其他' },
  s_moveUp: { en: 'Move up', km: 'ឡើងលើ', zh: '上移' },
  s_moveDown: { en: 'Move down', km: 'ចុះក្រោម', zh: '下移' },
  s_deleteCategory: { en: 'Delete category', km: 'លុបប្រភេទ', zh: '删除分类' },
  s_available: { en: 'Available', km: 'មានលក់', zh: '有货' },
  s_soldOutShort: { en: 'Sold out', km: 'អស់', zh: '售罄' },
  s_addDish: { en: 'Add dish', km: 'បន្ថែមម្ហូប', zh: '添加菜品' },
  s_newCatPlaceholder: { en: 'New category, e.g. Breakfast', km: 'ប្រភេទថ្មី ឧ. Breakfast', zh: '新分类，例如 Breakfast' },
  s_addCategory: { en: 'Add category', km: 'បន្ថែមប្រភេទ', zh: '添加分类' },
  s_photoFailed: { en: 'Photo upload failed: {msg}', km: 'បង្ហោះរូបមិនបាន៖ {msg}', zh: '照片上传失败：{msg}' },
  s_needName: { en: 'Give the dish a name.', km: 'សូមដាក់ឈ្មោះម្ហូប។', zh: '请填写菜名。' },
  s_badPrice: { en: 'Enter a valid price in USD, e.g. 4.50', km: 'សូមបញ្ចូលតម្លៃជាដុល្លារឲ្យត្រឹមត្រូវ ឧ. 4.50', zh: '请输入有效的美元价格，例如 4.50' },
  s_badCost: { en: 'Cost must be a number in USD, or left empty.', km: 'ថ្លៃដើមត្រូវជាលេខដុល្លារ ឬទុកទទេ។', zh: '成本须为美元数字，或留空。' },
  s_dishSaved: { en: 'Dish saved', km: 'បានរក្សាទុកម្ហូប', zh: '菜品已保存' },
  s_dishAdded: { en: 'Dish added to the menu', km: 'បានបន្ថែមម្ហូបទៅម៉ឺនុយ', zh: '菜品已加入菜单' },
  s_confirmDeleteDish: { en: 'Delete “{name}” from the menu?', km: 'លុប “{name}” ចេញពីម៉ឺនុយមែនទេ?', zh: '从菜单删除“{name}”？' },
  s_dishDeleted: { en: 'Dish deleted', km: 'បានលុបម្ហូប', zh: '菜品已删除' },
  s_editDish: { en: 'Edit dish', km: 'កែម្ហូប', zh: '编辑菜品' },
  s_newDish: { en: 'New dish', km: 'ម្ហូបថ្មី', zh: '新菜品' },
  s_changePhoto: { en: 'Change photo', km: 'ប្ដូររូប', zh: '更换照片' },
  s_uploadPhoto: { en: 'Upload photo', km: 'បង្ហោះរូប', zh: '上传照片' },
  s_removePhoto: { en: 'Remove photo', km: 'ដករូបចេញ', zh: '删除照片' },
  s_noPhotoHint: { en: 'No photo yet? The emoji is shown instead.', km: 'មិនទាន់មានរូប? នឹងបង្ហាញ emoji ជំនួស។', zh: '还没有照片？会显示表情符号。' },
  s_name: { en: 'Name', km: 'ឈ្មោះ', zh: '名称' },
  s_description: { en: 'Description', km: 'ការពិពណ៌នា', zh: '描述' },
  s_priceUsd: { en: 'Price (USD)', km: 'តម្លៃ (USD)', zh: '价格（美元）' },
  s_costUsd: { en: 'Cost to make (USD, private)', km: 'ថ្លៃដើម (USD, សម្ងាត់)', zh: '成本（美元，仅自己可见）' },
  s_costPlaceholder: { en: 'optional, for profit report', km: 'មិនចាំបាច់ សម្រាប់គិតចំណេញ', zh: '可选，用于利润报表' },
  s_emoji: { en: 'Emoji', km: 'Emoji', zh: '表情符号' },
  s_category: { en: 'Category', km: 'ប្រភេទ', zh: '分类' },
  s_spicy: { en: 'Spicy', km: 'ហឹរ', zh: '辣度' },
  s_notSpicy: { en: 'Not spicy', km: 'មិនហឹរ', zh: '不辣' },
  s_mild: { en: 'Mild', km: 'ហឹរតិច', zh: '微辣' },
  s_medium: { en: 'Medium', km: 'ហឹរមធ្យម', zh: '中辣' },
  s_hot: { en: 'Hot', km: 'ហឹរខ្លាំង', zh: '特辣' },
  s_tags: { en: 'Tags (comma separated)', km: 'ស្លាក (បំបែកដោយក្បៀស)', zh: '标签（用逗号分隔）' },
  s_chefsPickToggle: { en: 'Chef’s pick (shown at the top of the menu)', km: 'ម្ហូបណែនាំ (បង្ហាញខាងលើម៉ឺនុយ)', zh: '主厨推荐（显示在菜单顶部）' },
  s_availableToday: { en: 'Available today', km: 'មានលក់ថ្ងៃនេះ', zh: '今日有售' },
  s_saving: { en: 'Saving…', km: 'កំពុងរក្សាទុក…', zh: '保存中…' },
  s_saveDish: { en: 'Save dish', km: 'រក្សាទុកម្ហូប', zh: '保存菜品' },
  s_save: { en: 'Save', km: 'រក្សាទុក', zh: '保存' },

  // Settings
  s_uploadFailed: { en: 'Upload failed: {msg}', km: 'បង្ហោះមិនបាន៖ {msg}', zh: '上传失败：{msg}' },
  s_settingsSaved: { en: 'Settings saved', km: 'បានរក្សាទុកការកំណត់', zh: '设置已保存' },
  s_restaurantDetails: { en: 'Restaurant details', km: 'ព័ត៌មានហាង', zh: '餐厅信息' },
  s_restaurantName: { en: 'Restaurant name', km: 'ឈ្មោះហាង', zh: '餐厅名称' },
  s_tagline: { en: 'Tagline', km: 'ពាក្យស្លោក', zh: '标语' },
  s_hours: { en: 'Opening hours', km: 'ម៉ោងបើក', zh: '营业时间' },
  s_phone: { en: 'Phone', km: 'លេខទូរស័ព្ទ', zh: '电话' },
  s_address: { en: 'Address', km: 'អាសយដ្ឋាន', zh: '地址' },
  s_menuStyle: { en: 'Menu style', km: 'រចនាប័ទ្មម៉ឺនុយ', zh: '菜单风格' },
  s_menuStyleIntro: {
    en: 'Pick the vibe that matches your restaurant. You can still change the brand colour below.',
    km: 'ជ្រើសរចនាប័ទ្មដែលសមនឹងហាងរបស់អ្នក។ អ្នកនៅតែអាចប្ដូរពណ៌ម៉ាកខាងក្រោមបាន។',
    zh: '选择适合餐厅的风格，下方仍可更改品牌颜色。',
  },
  s_previewStyle: { en: 'Preview this style on your menu', km: 'មើលរចនាប័ទ្មនេះលើម៉ឺនុយរបស់អ្នក', zh: '在菜单上预览此风格' },
  s_look: { en: 'Look', km: 'រូបរាង', zh: '外观' },
  s_brandColour: { en: 'Brand colour', km: 'ពណ៌ម៉ាក', zh: '品牌颜色' },
  s_logo: { en: 'Logo', km: 'ឡូហ្គោ', zh: '标志' },
  s_cover: { en: 'Cover photo (top of the menu)', km: 'រូបគម្រប (ខាងលើម៉ឺនុយ)', zh: '封面照片（菜单顶部）' },
  s_menuLanguages: { en: 'Menu languages', km: 'ភាសាម៉ឺនុយ', zh: '菜单语言' },
  s_menuLanguagesIntro: {
    en: 'Diners switch language at the top of the menu. Add the Khmer / Chinese names when you edit each dish. The kitchen always sees English.',
    km: 'ភ្ញៀវប្ដូរភាសានៅខាងលើម៉ឺនុយ។ បន្ថែមឈ្មោះខ្មែរ / ចិន ពេលកែម្ហូបនីមួយៗ។ ផ្ទះបាយឃើញជាភាសាអង់គ្លេសជានិច្ច។',
    zh: '顾客可在菜单顶部切换语言。编辑菜品时添加高棉语 / 中文名称。厨房始终显示英文。',
  },
  s_pricesOrdering: { en: 'Prices & ordering', km: 'តម្លៃ & ការកុម្ម៉ង់', zh: '价格与点餐' },
  s_rielPerUsd: { en: 'Riel per $1', km: 'រៀល ក្នុង $1', zh: '每 $1 兑瑞尔' },
  s_showRiel: { en: 'Show riel prices too', km: 'បង្ហាញតម្លៃជារៀលផង', zh: '同时显示瑞尔价格' },
  s_allowOrdering: { en: 'Allow ordering from table QR codes', km: 'អនុញ្ញាតឲ្យកុម្ម៉ង់តាម QR លើតុ', zh: '允许扫桌码点餐' },
  s_allowOrderingHint: { en: 'Turn off when the kitchen is too busy. The menu stays visible.', km: 'បិទពេលផ្ទះបាយរវល់ពេក។ ម៉ឺនុយនៅតែមើលឃើញ។', zh: '厨房太忙时可关闭，菜单仍可查看。' },
  s_saveChanges: { en: 'Save changes', km: 'រក្សាទុក', zh: '保存更改' },
  s_upload: { en: 'Upload', km: 'បង្ហោះ', zh: '上传' },
  s_remove: { en: 'Remove', km: 'ដកចេញ', zh: '删除' },

  // Daily report
  s_yesterday: { en: 'Yesterday', km: 'ម្សិលមិញ', zh: '昨天' },
  s_reportLocked: { en: 'Daily report is an add-on', km: 'របាយការណ៍ប្រចាំថ្ងៃ ជាមុខងារបន្ថែម', zh: '日报是附加功能' },
  s_reportLockedBody: {
    en: 'See today’s sales, profit, orders, drinks and best sellers the moment you close. Ask KhMenu to switch it on for your restaurant.',
    km: 'មើលការលក់ ចំណេញ ការកុម្ម៉ង់ ភេសជ្ជៈ និងម្ហូបលក់ដាច់ប្រចាំថ្ងៃ ភ្លាមៗពេលបិទហាង។ សូមស្នើ KhMenu ឲ្យបើកមុខងារនេះសម្រាប់ហាងរបស់អ្នក។',
    zh: '打烊时即可查看今日销售额、利润、订单、饮品和畅销菜品。请联系 KhMenu 为您的餐厅开通。',
  },
  s_endOfDay: { en: 'End-of-day report · {date}', km: 'របាយការណ៍ចុងថ្ងៃ · {date}', zh: '日终报表 · {date}' },
  s_prevDay: { en: 'Previous day', km: 'ថ្ងៃមុន', zh: '前一天' },
  s_nextDay: { en: 'Next day', km: 'ថ្ងៃបន្ទាប់', zh: '后一天' },
  s_noOrdersDay: { en: 'No orders on this day yet.', km: 'មិនទាន់មានការកុម្ម៉ង់នៅថ្ងៃនេះទេ។', zh: '当天还没有订单。' },
  s_totalSales: { en: 'Total sales', km: 'ការលក់សរុប', zh: '总销售额' },
  s_vsDayBefore: { en: '{pct}% vs day before', km: '{pct}% ធៀបនឹងថ្ងៃមុន', zh: '较前一天 {pct}%' },
  s_profit: { en: 'Profit', km: 'ចំណេញ', zh: '利润' },
  s_na: { en: 'n/a', km: 'គ្មាន', zh: '暂无' },
  s_afterCosts: { en: 'After food costs', km: 'ក្រោយដកថ្លៃដើម', zh: '扣除食材成本后' },
  s_profitPartial: { en: 'Based on {pct}% of items with a cost set', km: 'ផ្អែកលើ {pct}% នៃម្ហូបដែលមានថ្លៃដើម', zh: '基于已设成本的 {pct}% 菜品' },
  s_profitNone: { en: 'Add dish costs in Menu to see profit', km: 'បញ្ចូលថ្លៃដើមម្ហូបក្នុងម៉ឺនុយ ដើម្បីមើលចំណេញ', zh: '在菜单中填写菜品成本即可查看利润' },
  s_avgPerOrder: { en: 'Avg {amt} per order', km: 'ជាមធ្យម {amt} ក្នុងមួយកុម្ម៉ង់', zh: '平均每单 {amt}' },
  s_itemsSold: { en: 'Items sold', km: 'ចំនួនលក់បាន', zh: '售出件数' },
  s_collected: { en: 'Collected {amt}', km: 'ប្រមូលបាន {amt}', zh: '已收 {amt}' },
  s_groupSold: { en: '{group} sold', km: '{group} លក់បាន', zh: '已售{group}' },
  s_topDish: { en: 'Most popular dish', km: 'ម្ហូបពេញនិយមបំផុត', zh: '最受欢迎菜品' },
  s_topDrink: { en: 'Most popular drink', km: 'ភេសជ្ជៈពេញនិយមបំផុត', zh: '最受欢迎饮品' },
  s_noneYet: { en: 'None yet', km: 'មិនទាន់មាន', zh: '暂无' },
  s_nSold: { en: '{n} sold', km: 'លក់បាន {n}', zh: '已售 {n}' },
  s_bestSellers: { en: 'Best sellers', km: 'លក់ដាច់ជាងគេ', zh: '畅销榜' },
  s_portionsSold: { en: 'Portions sold', km: 'ចំនួនចានលក់បាន', zh: '售出份数' },
  s_itemTitle: { en: '{name}: {n} sold · {amt}', km: '{name}៖ លក់បាន {n} · {amt}', zh: '{name}：已售 {n} · {amt}' },
  s_busiestHours: { en: 'Busiest hours', km: 'ម៉ោងមមាញឹកបំផុត', zh: '最忙时段' },
  s_ordersPerHour: { en: 'Orders per hour', km: 'ការកុម្ម៉ង់ក្នុងមួយម៉ោង', zh: '每小时订单' },
  s_peak: { en: ' · peak {hour} with {n} orders', km: ' · ច្រើនបំផុតម៉ោង {hour} មាន {n} កុម្ម៉ង់', zh: ' · 高峰 {hour}，{n} 单' },
  s_nOrders: { en: '{n} orders', km: '{n} កុម្ម៉ង់', zh: '{n} 单' },
} satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

export function translate(lang: Lang, key: StringKey, vars?: Record<string, string | number>) {
  let s: string = STRINGS[key][lang] ?? STRINGS[key].en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

type Translatable = { name: string; description?: string | null; i18n?: Record<string, { name?: string; description?: string } | undefined> | null };

/** Dish / category text in the diner's language, falling back to the base (English) text. */
export function loc(entity: Translatable, lang: Lang, field: 'name' | 'description' = 'name'): string {
  const base = field === 'name' ? entity.name : entity.description ?? '';
  if (lang === 'en') return base;
  return entity.i18n?.[lang]?.[field]?.trim() || base;
}

/** Option group / choice labels store translations as {km: "...", zh: "..."}. */
export function locLabel(entity: { name: string; i18n?: Partial<Record<Lang, string>> }, lang: Lang) {
  return (lang !== 'en' && entity.i18n?.[lang]?.trim()) || entity.name;
}

const STORAGE_KEY = 'khmenu:lang';

function initialLang(available: Lang[], detect: boolean): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && available.includes(saved)) return saved;
  } catch {
    // Storage blocked: fall through to the browser language.
  }
  if (!detect) return 'en';
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith('km') && available.includes('km')) return 'km';
  if (nav.startsWith('zh') && available.includes('zh')) return 'zh';
  return 'en';
}

/** `detect`: with nothing saved, use the browser language (diners). Staff pass false and start in English. */
export function useLang(available: Lang[], detect = true) {
  const [lang, setLangState] = useState<Lang>(() => initialLang(available, detect));
  const key = available.join(',');

  useEffect(() => {
    if (!available.includes(lang)) setLangState(initialLang(available, detect));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Remembering the language is only a convenience.
    }
  }, []);

  const t = useCallback((k: StringKey, vars?: Record<string, string | number>) => translate(lang, k, vars), [lang]);
  return { lang, setLang, t };
}

export const ALL_LANGS: Lang[] = LANGS.map((l) => l.id);

/** The staff app provides this once in AdminPage; its components read it with useT(). */
export const LangContext = createContext<ReturnType<typeof useLang>>({ lang: 'en', setLang: () => {}, t: (k, vars) => translate('en', k, vars) });
export const useT = () => useContext(LangContext);
