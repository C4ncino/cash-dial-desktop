export class NavbarMenu {
  private openButton: HTMLButtonElement;
  private linkList: HTMLUListElement;

  constructor() {
    this.openButton = document.getElementById("menu") as HTMLButtonElement;

    if (this.openButton instanceof HTMLButtonElement)
      this.openButton.addEventListener("click", () => this.toggle());

    this.linkList = document.getElementById("links") as HTMLUListElement;
  }

  toggle() {
    this.linkList.classList.toggle("hidden");
    this.linkList.classList.toggle("flex");

    const icons = this.openButton.children;

    for (const icon of icons) {
      icon.classList.toggle("hidden");
    }
  }
}
