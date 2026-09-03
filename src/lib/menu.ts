export class NavbarMenu {
  private openButton: HTMLButtonElement | null;
  private linkList: HTMLUListElement | null;

  constructor() {
    this.openButton = document.getElementById("menu") as HTMLButtonElement | null;

    if (this.openButton instanceof HTMLButtonElement)
      this.openButton.addEventListener("click", () => this.toggle());

    this.linkList = document.getElementById("links") as HTMLUListElement | null;
  }

  toggle() {
    if (!this.openButton || !this.linkList) return;
    this.linkList.classList.toggle("hidden");
    this.linkList.classList.toggle("flex");

    const icons = this.openButton.children;

    for (const icon of icons) {
      icon.classList.toggle("hidden");
    }
  }
}
