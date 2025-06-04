function AlexNet() {

    // /////////////////////////////////////////////////////////////////////////////
    //                       ///////    Variables    ///////
    // /////////////////////////////////////////////////////////////////////////////

    var w = window.innerWidth;
    var h = window.innerHeight;

    var rectOpacity = 0.4;
    var filterOpacity = 0.4;
    var fontScale = 1;

    var line_material = new THREE.LineBasicMaterial( { 'color':0x000000 } );

    var architecture = []; // Expects { ..., color: "#hex", convColor: "#hex", pyramidColor: "#hex" }
    var architecture2 = []; // Expects { ..., color: "#hex" }
    var betweenLayers = 20;

    var logDepth = true;
    var depthScale = 10;
    var logWidth = true;
    var widthScale = 10;
    var logConvSize = false;
    var convScale = 1;

    var showDims = false;
    var showConvDims = false;

    let depthFn = (depth) => depth ? (logDepth ? (Math.log(Math.max(1,depth)) * depthScale) : (depth * depthScale)) : 0;
    let widthFn = (width) => width ? (logWidth ? (Math.log(Math.max(1,width)) * widthScale) : (width * widthScale)) : 0;
    let convFn = (conv) => conv ? (logConvSize ? (Math.log(Math.max(1,conv)) * convScale) : (conv * convScale)) : 0;


    function wf(layer) { return widthFn(layer['width']); }
    function hf(layer) { return widthFn(layer['height']); }

    var layers = new THREE.Group();
    var convs = new THREE.Group();
    var pyramids = new THREE.Group();
    var sprites = new THREE.Group();


    var scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xffffff );

    var camera = new THREE.OrthographicCamera( w / - 2, w / 2, h / 2, h / - 2, -10000000, 10000000 );
    camera.position.set(-219, 92, 84); // Adjust as needed for initial view

    var renderer;
    var rendererType = 'webgl';

    var controls;

    function restartRenderer({rendererType_=rendererType}={}) {
        rendererType = rendererType_;
        clearThree(scene);

        if (rendererType === 'webgl') { renderer = new THREE.WebGLRenderer( { 'alpha':true, antialias: true } ); }
        else if (rendererType === 'svg') { renderer = new THREE.SVGRenderer(); }

        renderer.setPixelRatio(window.devicePixelRatio || 1);
        renderer.setSize( window.innerWidth, window.innerHeight );

        graph_container = document.getElementById('graph-container')
        while (graph_container.firstChild) { graph_container.removeChild(graph_container.firstChild); }
        graph_container.appendChild( renderer.domElement );

        if (controls) { controls.dispose(); }
        controls = new THREE.OrbitControls( camera, renderer.domElement );
        controls.enableRotate = true; // Or false if you prefer static view control
        // controls.target.set(0, 0, 0); // Optional: set orbit target
        // controls.update(); // Apply target

        animate();
    }

    function animate() {
        requestAnimationFrame( animate );
        if (controls) controls.update();
        sprites.children.forEach(sprite => {
            if (sprite.isSprite) {
                // Sprite specific updates if any (usually billboarded by default)
            } else if (sprite.quaternion && camera) { // Ensure camera is defined
                 sprite.quaternion.copy(camera.quaternion);
            }
        });
        if (renderer && scene && camera) { // Ensure all are defined
            renderer.render(scene, camera);
        }
    };

    restartRenderer();

    function redraw({architecture_=architecture,
                     architecture2_=architecture2,
                     betweenLayers_=betweenLayers,
                     logDepth_=logDepth,
                     depthScale_=depthScale,
                     logWidth_=logWidth,
                     widthScale_=widthScale,
                     logConvSize_=logConvSize,
                     convScale_=convScale,
                     showDims_=showDims,
                     showConvDims_=showConvDims}={}) {

        console.log("AlexNet redraw CALLED. Inputs:");
        console.log("  architecture_:", JSON.parse(JSON.stringify(architecture_)));
        console.log("  architecture2_:", JSON.parse(JSON.stringify(architecture2_)));
        console.log("  rectOpacity:", rectOpacity, "filterOpacity:", filterOpacity);

        architecture = architecture_;
        architecture2 = architecture2_;
        betweenLayers = betweenLayers_;
        logDepth = logDepth_;
        depthScale = depthScale_;
        logWidth = logWidth_;
        widthScale = widthScale_;
        logConvSize = logConvSize_;
        convScale = convScale_;
        showDims = showDims_;
        showConvDims = showConvDims_;

        clearThree(scene);

        layers = new THREE.Group();
        convs = new THREE.Group();
        pyramids = new THREE.Group();
        sprites = new THREE.Group();

        let totalDepthCalc = 0;
        if (architecture && architecture.length > 0) { // Check if architecture is defined and not empty
            totalDepthCalc += sum(architecture.map(layer => depthFn(layer['depth']))) + (betweenLayers * (architecture.length > 1 ? architecture.length - 1 : 0));
        }
        // Similar check for architecture2 if its depth contributes to totalDepthCalc for centering
        // For now, centering based on conv layers.
        z_offset = -totalDepthCalc / 2; // Adjust centering logic as needed, e.g. /2 for front view

        var current_z = z_offset;
        layer_offsets = [];

        if (architecture && architecture.length > 0) {
            architecture.forEach(function(layer, index) {
                if (!layer || typeof layer.depth === 'undefined') {
                    console.warn(`Layer ${index} is undefined or missing depth. Skipping.`);
                    return; // Skip this iteration
                }
                const d = depthFn(layer['depth']);
                if (index === 0) {
                    layer_offsets.push(current_z + d / 2);
                } else {
                    layer_offsets.push(current_z + betweenLayers + d / 2);
                }
                current_z = layer_offsets.last() + d / 2;

                console.log(`Arch Layer ${index}: Name='${layer.name || 'N/A'}', TensorColor='${layer.color}', ConvColor='${layer.convColor}', PyramidColor='${layer.pyramidColor}', Depth=${layer.depth}`);

                const layerMaterial = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(layer.color || '#eeeeee'),
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: rectOpacity,
                    depthWrite: false,
                });
                const layer_geom_w = wf(layer);
                const layer_geom_h = hf(layer);
                if (layer_geom_w <= 0 || layer_geom_h <= 0 || d <= 0) {
                     console.warn(`Layer ${index} has non-positive dimensions after scaling. W:${layer_geom_w}, H:${layer_geom_h}, D:${d}`);
                }
                layer_geometry = new THREE.BoxGeometry( Math.max(0.1, layer_geom_w), Math.max(0.1, layer_geom_h), Math.max(0.1, d) );
                layer_object = new THREE.Mesh( layer_geometry, layerMaterial );
                layer_object.position.set(0, 0, layer_offsets.last());
                layers.add( layer_object );

                layer_edges_geometry = new THREE.EdgesGeometry( layer_geometry );
                layer_edges_object = new THREE.LineSegments( layer_edges_geometry, line_material );
                layer_edges_object.position.set(0, 0, layer_offsets.last());
                layers.add( layer_edges_object );

                if (index < architecture.length - 1) {
                    // Conv Filter Material (Body of the bullet)
                    const convMaterial = new THREE.MeshBasicMaterial({
                        color: new THREE.Color(layer.convColor || layer.color || '#99ddff'), // Use specific convColor, then tensor color, then default
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: filterOpacity,
                        depthWrite: false,
                    });
                    const conv_geom_w = convFn(layer['filterWidth']);
                    const conv_geom_h = convFn(layer['filterHeight']);
                     if (conv_geom_w <= 0 || conv_geom_h <= 0 || d <= 0) {
                        console.warn(`Conv for Layer ${index} has non-positive dimensions. W:${conv_geom_w}, H:${conv_geom_h}, D:${d}`);
                    }
                    conv_geometry = new THREE.BoxGeometry( Math.max(0.1, conv_geom_w), Math.max(0.1, conv_geom_h), Math.max(0.1, d) );
                    conv_object = new THREE.Mesh( conv_geometry, convMaterial );
                    conv_object.position.set((layer['rel_x'] || 0) * wf(layer), (layer['rel_y'] || 0) * hf(layer), layer_offsets.last());
                    convs.add( conv_object );

                    conv_edges_geometry = new THREE.EdgesGeometry( conv_geometry );
                    conv_edges_object = new THREE.LineSegments( conv_edges_geometry, line_material );
                    conv_edges_object.position.set((layer['rel_x'] || 0) * wf(layer), (layer['rel_y'] || 0) * hf(layer), layer_offsets.last());
                    convs.add( conv_edges_object );

                    // Pyramid Connector Material
                    const pyramidMaterial = new THREE.MeshBasicMaterial({
                        color: new THREE.Color(layer.pyramidColor || '#ffbbbb'), // Use specific pyramidColor from current layer, then default
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: filterOpacity,
                        depthWrite: false,
                    });
                    pyramid_geometry = new THREE.Geometry(); // Consider BufferGeometry for newer Three.js
                    base_z = layer_offsets.last() + (d / 2);
                    summit_z = layer_offsets.last() + (d / 2) + betweenLayers;

                    pyramid_geometry.vertices = [
                        new THREE.Vector3( ((layer['rel_x']||0) * wf(layer)) + (convFn(layer['filterWidth'])/2), ((layer['rel_y']||0) * hf(layer)) + (convFn(layer['filterHeight'])/2), base_z ),
                        new THREE.Vector3( ((layer['rel_x']||0) * wf(layer)) + (convFn(layer['filterWidth'])/2), ((layer['rel_y']||0) * hf(layer)) - (convFn(layer['filterHeight'])/2), base_z ),
                        new THREE.Vector3( ((layer['rel_x']||0) * wf(layer)) - (convFn(layer['filterWidth'])/2), ((layer['rel_y']||0) * hf(layer)) - (convFn(layer['filterHeight'])/2), base_z ),
                        new THREE.Vector3( ((layer['rel_x']||0) * wf(layer)) - (convFn(layer['filterWidth'])/2), ((layer['rel_y']||0) * hf(layer)) + (convFn(layer['filterHeight'])/2), base_z ),
                        new THREE.Vector3( 0, 0, summit_z) // Summit point connects to center of next layer's area
                    ];
                    pyramid_geometry.faces = [new THREE.Face3(0,1,2),new THREE.Face3(0,2,3),new THREE.Face3(1,0,4),new THREE.Face3(2,1,4),new THREE.Face3(3,2,4),new THREE.Face3(0,3,4)];
                    pyramid_geometry.computeFaceNormals();

                    pyramid_object = new THREE.Mesh( pyramid_geometry, pyramidMaterial );
                    pyramids.add( pyramid_object );

                    pyramid_edges_geometry = new THREE.EdgesGeometry( pyramid_geometry );
                    pyramid_edges_object = new THREE.LineSegments( pyramid_edges_geometry, line_material );
                    pyramids.add( pyramid_edges_object );
                }
                if (showDims) {
                    if(layer_object && layer_object.position) makeTextSprite(rendererType === 'svg', layer['depth'].toString(), layer_object.position, new THREE.Vector3( wf(layer)/2 + 2, hf(layer)/2 + 2, 0 ));
                    if(layer_object && layer_object.position) makeTextSprite(rendererType === 'svg', layer['width'].toString(), layer_object.position, new THREE.Vector3( wf(layer)/2 + 3, 0, d/2 + 3 ));
                    if(layer_object && layer_object.position) makeTextSprite(rendererType === 'svg', layer['height'].toString(), layer_object.position, new THREE.Vector3( 0, -hf(layer)/2 - 3, d/2 + 3 ));
                }
                if (showConvDims && index < architecture.length - 1 && conv_object && conv_object.position) {
                    makeTextSprite(rendererType === 'svg', layer['filterHeight'].toString(), conv_object.position, new THREE.Vector3( convFn(layer['filterWidth'])/2, -3, d/2 + 3 ));
                    makeTextSprite(rendererType === 'svg', layer['filterWidth'].toString(), conv_object.position, new THREE.Vector3( -1, convFn(layer['filterHeight'])/2, d/2 + 3 ));
                }
            });
        }


        if (architecture && architecture.length > 0) {
             // current_z is already at the end of the last architecture layer if architecture existed
        } else if (architecture2 && architecture2.length > 0) { // Only architecture2 layers
            current_z = z_offset; // Start from z_offset if no conv layers
        }


        if (architecture2 && architecture2.length > 0) {
            architecture2.forEach( function( layer, index ) {
                 if (!layer || typeof layer.depth === 'undefined') {
                    console.warn(`Dense Layer ${index} is undefined or missing depth. Skipping.`);
                    return; 
                }
                const d = depthFn(layer.depth);
                if (architecture.length === 0 && index === 0) {
                     layer_offsets.push(current_z + d/2);
                } else {
                     layer_offsets.push(current_z + betweenLayers + d / 2);
                }
                current_z = layer_offsets.last() + d / 2;

                console.log(`Dense Layer (arch2) ${index}: Color='${layer.color}', Depth=${layer.depth}`);

                const denseLayerMaterial = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(layer.color || '#ddccdd'),
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: rectOpacity,
                    depthWrite: false,
                });
                const dense_geom_wh = widthFn(2);
                if (dense_geom_wh <= 0 || d <=0) {
                    console.warn(`Dense Layer ${index} has non-positive dimensions. WH:${dense_geom_wh}, D:${d}`);
                }
                layer_geometry = new THREE.BoxGeometry( Math.max(0.1, dense_geom_wh), Math.max(0.1, d), Math.max(0.1, dense_geom_wh) ); // Assuming Y is depth for dense
                layer_object = new THREE.Mesh( layer_geometry, denseLayerMaterial );
                layer_object.position.set(0, 0, layer_offsets.last());
                layers.add( layer_object );

                layer_edges_geometry = new THREE.EdgesGeometry( layer_geometry );
                layer_edges_object = new THREE.LineSegments( layer_edges_geometry, line_material );
                layer_edges_object.position.set(0, 0, layer_offsets.last());
                layers.add( layer_edges_object );

                if (index > 0 || (architecture && architecture.length > 0)) {
                    const arrowOriginZ = layer_offsets.last() - d/2 - betweenLayers;
                    const arrowLength = betweenLayers - 2 > 0 ? betweenLayers -2 : 1;
                    const headLength = Math.max(1, betweenLayers / 4);
                    const headWidth = Math.max(1, headLength * 0.6);

                    arrow = new THREE.ArrowHelper(
                        new THREE.Vector3(0,0,1),
                        new THREE.Vector3(0,0, arrowOriginZ),
                        arrowLength,
                        0x000000,
                        headLength,
                        headWidth
                    );
                    pyramids.add(arrow);
                }
                 if (showDims && layer_object && layer_object.position) {
                    makeTextSprite(rendererType === 'svg', layer.depth.toString(), layer_object.position, new THREE.Vector3( widthFn(2)/2 + 3, d/2 + 4, 0 )); // Adjust sprite pos as needed
                }
            });
        }

        scene.add( layers );
        scene.add( convs );
        scene.add( pyramids );
        scene.add( sprites );
        console.log("AlexNet redraw FINISHED.");
    }


    function clearThree(obj) {
        if (!obj) return;
        while(obj.children && obj.children.length > 0) {
            let child = obj.children[0];
            clearThree(child);
            obj.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => { if(material.dispose) material.dispose(); });
                } else {
                    if(child.material.dispose) child.material.dispose();
                }
            }
            if (child.texture) { // For SpriteMaterials or materials with textures
                 if(child.texture.dispose) child.texture.dispose();
            }
        }
    }


    function makeTextSprite(should_make_geometry, message, copy_pos, sub_pos, opts) {
         if (!message || !copy_pos || !sub_pos) {
            // console.warn("makeTextSprite: Missing required parameters (message, copy_pos, or sub_pos).");
            return; // Do not proceed if essential parameters are missing
        }
         if (should_make_geometry && rendererType === 'svg') {
            const loader = new THREE.FontLoader();
            try {
                loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
                    if (!font) {
                        console.error("Failed to load font for SVG text.");
                        return;
                    }
                    let geometry = new THREE.TextGeometry(message.toString(), {
                        font: font,
                        size: 3 * fontScale,
                        height: 0.01,
                    });
                    geometry.center();

                    let material = new THREE.MeshBasicMaterial({ color: 0x000000 });
                    let sprite = new THREE.Mesh(geometry, material);
                    sprite.position.copy(copy_pos).sub(sub_pos);
                    sprites.add(sprite);
                }, undefined, function(error) {
                    console.error("Error loading font for SVG text:", error);
                });
            } catch (e) {
                console.error("Exception in FontLoader for SVG:", e);
            }


        } else { // WebGL Sprite Text
            var parameters = opts || {};
            var fontface = parameters.fontface || 'Helvetica';
            var fontsize = parameters.fontsize || 20; // Reduced base fontsize for WebGL sprite canvas
            var effectiveFontsize = Math.max(1, fontsize * fontScale);

            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            context.font = effectiveFontsize + "px " + fontface;

            var metrics = context.measureText(message.toString());
            var textWidth = metrics.width;
            canvas.width = Math.max(1, textWidth + effectiveFontsize * 0.2); // Add some padding
            canvas.height = Math.max(1, effectiveFontsize * 1.4);

            context.font = effectiveFontsize + "px " + fontface; // Re-set font after canvas resize
            context.fillStyle = 'rgba(0, 0, 0, 1.0)';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(message.toString(), canvas.width / 2, canvas.height / 2 );


            var texture = new THREE.Texture(canvas)
            texture.minFilter = THREE.LinearFilter; // Good for text
            texture.needsUpdate = true;

            var spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false }); // depthTest false helps visibility
            var sprite = new THREE.Sprite( spriteMaterial );

            // Scale the sprite in world units. This needs careful adjustment.
            // The idea is to make the canvas text roughly a certain size in world space.
            const desiredHeightInWorldUnits = 5 * fontScale; // Adjust this base value
            sprite.scale.set( (canvas.width / canvas.height) * desiredHeightInWorldUnits , desiredHeightInWorldUnits , 1.0 );
            sprite.center.set(0.5, 0.5); // Center of the sprite texture

            sprite.position.copy(copy_pos).sub(sub_pos);
            sprites.add(sprite);
        }
    }


    function style({
                    rectOpacity_=rectOpacity,
                    filterOpacity_=filterOpacity,
                    fontScale_ =fontScale,
                }={}) {
        rectOpacity   = rectOpacity_;
        filterOpacity = filterOpacity_;
        fontScale     = fontScale_;
        console.log("AlexNet style CALLED. New opacities/fontScale:", rectOpacity, filterOpacity, fontScale);
    }

    function onWindowResize() {
        w = window.innerWidth;
        h = window.innerHeight;

        if (renderer) {
            renderer.setSize(w, h);
        }
        if (camera) {
            camera.left = w / -2;
            camera.right = w / 2;
            camera.top = h / 2;
            camera.bottom = h / -2;
            camera.updateProjectionMatrix();
        }
    }
    window.addEventListener('resize', onWindowResize, false);

    function sum(arr) {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    }

    if (!Array.prototype.last){
        Array.prototype.last = function(){
            if (this.length === 0) return undefined; // Handle empty array
            return this[this.length - 1];
        };
    };

    return {
        'redraw'           : redraw,
        'restartRenderer'  : restartRenderer,
        'style'            : style,
        'scene'            : scene,
        'camera'           : camera
    }
}