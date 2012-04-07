describe("FontMetrics", function() {
  var FontMetrics = require('FontMetrics');

  it("should support getters for family and size", function() {
    var family = 'Arial, sans-serif',
        size = 18,
        metrics = new FontMetrics(family, size);

    expect(metrics.getFamily()).toEqual(family);
    expect(metrics.getSize()).toEqual(size);

    metrics = new FontMetrics;

    expect(metrics.getFamily()).toBeTruthy();
    expect(metrics.getSize()).toBeTruthy();
  });

  it("should calculate font metrics", function(){

    var metrics = new FontMetrics;

    expect(metrics.getHeight()).toBeTruthy();
    expect(metrics.getWidth()).toBeTruthy();
    expect(metrics.getBaseline()).toBeTruthy();
    
  });
});