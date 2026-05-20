const SUPPORTED_LANGS = ["th", "en"];
const DEFAULT_LANG = "th";

module.exports = (req, res, next) => {
  //ค้นหาภาษาจากหลายแหล่ง เรียงลำดับความสำคัญจากมากไปน้อย (cookies > ภาษาของ browser > ค่าเริ่มต้น)
  const candidate = 
    req.cookies?.lang ||    
    req.headers["accept-language"]?.substring(0, 2) ||
    DEFAULT_LANG;

  //บันทึกค่าลงในตัวแปร req.lang เพื่อให้ browser หน้าถัด ๆ ไปนำไปใช้ต่อได้
  req.lang = SUPPORTED_LANGS.includes(candidate) ? candidate : DEFAULT_LANG;
  next();
};