import Vue from "vue";
import App from "./App.vue";
import VConsole from "vconsole";
new VConsole();
Vue.config.productionTip = false;
console.log("navigator.userAgent", navigator.userAgent);

new Vue({
  render: h => h(App)
}).$mount("#app");
