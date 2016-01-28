export default class Colors {
  static colors = ["#0066cc", "#009933", "#ff9900", "#ee2222", '#cc33ff'];
  static currentIndex = 0;

  static getColor() {
    if(this.currentIndex > this.colors.length - 1) {
      this.currentIndex = 0;
    }

    return this.colors[this.currentIndex];
  }
};
