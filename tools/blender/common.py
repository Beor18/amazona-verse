import bpy, math
from mathutils import Vector
def hexrgb(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple((x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4) for x in c)+(1.0,)
MATS={
 "Feathers":("#3cb43c",0.75),"Beak":("#f2a23a",0.35),"EyeWhite":("#f4f4ee",0.25),
 "EyeIris":("#1c120a",0.15),"Patch":("#d63a2f",0.7),"Ring":("#f5f5f0",0.85),
 "WingTip":("#3cb43c",0.75),"Feet":("#f0b62a",0.5),"Claws":("#2a2522",0.4)}
def get_mat(name):
    m=bpy.data.materials.get(name)
    if m: return m
    m=bpy.data.materials.new(name); m.use_nodes=True
    bs=m.node_tree.nodes["Principled BSDF"]
    col,r=MATS[name]
    bs.inputs["Base Color"].default_value=hexrgb(col); bs.inputs["Roughness"].default_value=r
    m.diffuse_color=hexrgb(col)
    if name=="EyeIris":
        a=m.node_tree.nodes.new("ShaderNodeVertexColor"); a.layer_name="Col"
        m.node_tree.links.new(a.outputs["Color"],bs.inputs["Base Color"])
    return m
def set_mats(obj,names):
    obj.data.materials.clear()
    for n in names: obj.data.materials.append(get_mat(n))
