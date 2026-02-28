// controllers/canteenController.js
const Canteen  = require('../models/Canteen');
const Stall    = require('../models/Stall');
const MenuItem = require('../models/MenuItem');

// GET / — Home page with both canteens
exports.home = async (req, res) => {
  try {
    const canteens = await Canteen.findAll();
    res.render('index', { title: 'KLE Campus Canteen', canteens, user: req.user || null });
  } catch (err) {
    next(err);
  }
};

// GET /canteen/:id — Canteen page showing stalls
exports.canteenPage = async (req, res, next) => {
  try {
    const canteen = await Canteen.findWithStalls(req.params.id);
    if (!canteen) return res.status(404).render('error', { title: '404', message: 'Canteen not found', user: req.user });
    res.render('canteen', { title: canteen.name, canteen, user: req.user || null });
  } catch (err) {
    next(err);
  }
};

// GET /stall/:id — Stall menu page
exports.stallPage = async (req, res, next) => {
  try {
    const stall   = await Stall.findById(req.params.id);
    if (!stall) return res.status(404).render('error', { title: '404', message: 'Stall not found', user: req.user });
    const grouped = await MenuItem.findByStallGrouped(req.params.id);
    const active  = await Stall.getActiveOrderCount(req.params.id);
    res.render('stall', {
      title:      stall.name,
      stall,
      menuGrouped: grouped,
      activeOrders: active,
      user:         req.user || null,
    });
  } catch (err) {
    next(err);
  }
};