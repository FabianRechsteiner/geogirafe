class RedliningFeature {

    olFeature = null;
    
    get name() {
      return this.olFeature.get('name');
    }
    set name(value) {
      this.olFeature.set('name', value); 
    }

    get strokeColor() {
      return this.olFeature.get('strokeColor');
    }
    set strokeColor(value) {
      this.olFeature.set('strokeColor', value); 
    }

    get strokeWidth() {
      return this.olFeature.get('strokeWidth');
    }
    set strokeWidth(value) {
      this.olFeature.set('strokeWidth', value); 
    }

    get fillColor() {
      return this.olFeature.get('fillColor');
    }
    set fillColor(value) {
      this.olFeature.set('fillColor', value); 
    }

    get textSize() {
      return this.olFeature.get('textSize');
    }
    set textSize(value) {
      this.olFeature.set('textSize', value); 
    }
  
    get id() {
      return this.olFeature.ol_uid;
    }
  
    get geometry() {
      console.warn('not implemented yet');
      return null;
    }

    constructor(olFeature) {
      this.olFeature = olFeature;
    }
  }
  
  export default RedliningFeature;
  