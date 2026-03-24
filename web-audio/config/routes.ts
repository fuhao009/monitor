/**
 * @name umi 的路由配置
 * @description 只支持 path,component,routes,redirect,wrappers,name,icon 的配置
 * @param path  path 只支持两种占位符配置，第一种是动态参数 :id 的形式，第二种是 * 通配符，通配符只能出现路由字符串的最后。
 * @param component 配置 location 和 path 匹配后用于渲染的 React 组件路径。可以是绝对路径，也可以是相对路径，如果是相对路径，会从 src/pages 开始找起。
 * @param routes 配置子路由，通常在需要为多个路径增加 layout 组件时使用。
 * @param redirect 配置路由跳转
 * @param wrappers 配置路由组件的包装组件，通过包装组件可以为当前的路由组件组合进更多的功能。 比如，可以用于路由级别的权限校验
 * @param name 配置路由的标题，默认读取国际化文件 menu.ts 中 menu.xxxx 的值，如配置 name 为 login，则读取 menu.ts 中 menu.login 的取值作为标题
 * @param icon 配置路由的图标，取值参考 https://ant.design/components/icon-cn， 注意去除风格后缀和大小写，如想要配置图标为 <StepBackwardOutlined /> 则取值应为 stepBackward 或 StepBackward，如想要配置图标为 <UserOutlined /> 则取值应为 user 或者 User
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './User/Login',
      },
    ],
  },
  {
    name: 'dashboard.monitor',
    icon: 'dashboard',
    path: '/monitor',
    access: 'canAdmin',
    component: './Monitor',
  },
  {
    name: 'dashboard.hosts',
    icon: 'cluster',
    path: '/hosts',
    access: 'canAdmin',
    component: './Monitor/Hosts',
  },
  {
    name: 'dashboard.hostDetail',
    path: '/hosts/:id',
    access: 'canAdmin',
    component: './Monitor/Hosts/Detail',
    hideInMenu: true,
  },
  {
    name: 'dashboard.services',
    icon: 'deploymentUnit',
    path: '/services',
    access: 'canAdmin',
    component: './Monitor/Services',
  },
  {
    name: 'dashboard.serviceDetail',
    path: '/services/:id',
    access: 'canAdmin',
    component: './Monitor/Services/Detail',
    hideInMenu: true,
  },
  {
    name: 'dashboard.databases',
    icon: 'database',
    path: '/databases',
    access: 'canAdmin',
    component: './Monitor/Databases',
  },
  {
    name: 'dashboard.storage',
    icon: 'hdd',
    path: '/storage',
    access: 'canAdmin',
    component: './Monitor/Storage',
  },
  {
    name: 'dashboard.topology',
    icon: 'apartment',
    path: '/topology',
    access: 'canAdmin',
    component: './Monitor/Topology',
  },
  {
    name: 'dashboard.alerts',
    icon: 'alert',
    path: '/alerts',
    access: 'canAdmin',
    component: './Monitor/Alerts',
  },
  {
    name: 'dashboard.alertHistory',
    path: '/alerts/history',
    access: 'canAdmin',
    component: './Monitor/Alerts/History',
  },
  {
    name: 'dashboard.events',
    icon: 'notification',
    path: '/events',
    access: 'canAdmin',
    component: './Monitor/Events',
  },
  {
    name: 'dashboard.logsLive',
    icon: 'fileText',
    path: '/logs/live',
    access: 'canAdmin',
    component: './Monitor/Logs/Live',
  },
  {
    name: 'dashboard.logsSearch',
    path: '/logs/search',
    access: 'canAdmin',
    component: './Monitor/Logs/Search',
  },
  {
    name: 'dashboard.diagnostics',
    icon: 'safety',
    path: '/diagnostics',
    access: 'canAdmin',
    component: './Monitor/Diagnostics',
  },
  {
    name: 'dashboard.metrics',
    icon: 'lineChart',
    path: '/metrics',
    access: 'canAdmin',
    component: './Monitor/Metrics',
  },
  {
    name: 'dashboard.reportsAvailability',
    icon: 'barChart',
    path: '/reports/availability',
    access: 'canAdmin',
    component: './Monitor/Reports/Availability',
  },
  {
    name: 'dashboard.reportsCapacity',
    path: '/reports/capacity',
    access: 'canAdmin',
    component: './Monitor/Reports/Capacity',
  },
  {
    name: 'dashboard.settingsMonitor',
    icon: 'setting',
    path: '/settings/monitor',
    access: 'canAdmin',
    component: './Monitor/Settings/Monitor',
  },
  {
    name: 'dashboard.settingsNotifications',
    path: '/settings/notifications',
    access: 'canAdmin',
    component: './Monitor/Settings/Notifications',
  },
  {
    name: 'dashboard.settingsDatasources',
    path: '/settings/datasources',
    access: 'canAdmin',
    component: './Monitor/Settings/Datasources',
  },
  {
    name: 'dashboard.settingsUsers',
    path: '/settings/users',
    access: 'canAdmin',
    component: './Monitor/Settings/Users',
  },
  {
    path: '/',
    redirect: '/monitor',
  },
  {
    path: '*',
    layout: false,
    component: './404',
  },
];
