import GeoEvents from '/models/events.js';

class TreeView extends HTMLUListElement {

  constructor() {
    super();
    this.data = {};
    this.getJSON();
  }

  getJSON() {
    this.dirJSON = this.getAttribute('json');
    const request = new XMLHttpRequest();
    request.open('GET', this.dirJSON);
    request.responseType = 'json';
    request.send();
    request.onload = () => {
      this.data = request.response;
      this.render();
    };
  }

  render() {
    this.data["themes"].forEach(data => {
      const liParent = document.createElement(`li`);
      liParent.innerHTML = data.name;
      this.appendChild(liParent);
      if (data.children !== undefined) {
        this.childs(liParent, data);
        this.hide();
      }
    });
  }

  childs(liParent, data) {
    // Create a new unordered list for children
    const childList = document.createElement(`ul`);
    data.children.forEach(child => {
      const liChild = document.createElement(`li`);
      liChild.innerHTML = child.name;
      childList.appendChild(liChild);
      if (child.children !== undefined) {
        this.childs(liChild, child);
      }
    });
    liParent.appendChild(childList);
  }

  // Hide childs function
  hide() {
    var ulChildren = Array.from(this.querySelectorAll(`ul`));
    var liChildren = Array.from(this.querySelectorAll(`li`));
    ulChildren.forEach(ul => {
      ul.style.display = `none`;
    });
    liChildren.forEach(li => {
      var childrenText = li.childNodes[0];
      if (li.querySelector(`ul`) != null) {
        const span = document.createElement(`span`);
        span.textContent = childrenText.textContent;
        span.style.cursor = `pointer`;
        childrenText.parentNode.insertBefore(span, childrenText);
        childrenText.parentNode.removeChild(childrenText);
        span.onclick = (event) => {
          var next = event.target.nextElementSibling;
          if (next.style.display == ``) {
            next.style.display = `none`;
            window.dispatchEvent(new CustomEvent(GeoEvents.TreeView, { 
              bubbles: true, cancelable: false, composed: true, 
              detail: {
                action: 'leafClosed',
                leafName: span.innerHTML
              }
            }));
          }
          else {
            next.style.display = ``;
            window.dispatchEvent(new CustomEvent(GeoEvents.TreeView, { 
              bubbles: true, cancelable: false, composed: true, 
              detail: {
                action: 'leafOpened',
                leafName: span.innerHTML
              }
            }));
          }
        }
      }
    });
  }
}

customElements.define('tree-view', TreeView, { extends: 'ul' });