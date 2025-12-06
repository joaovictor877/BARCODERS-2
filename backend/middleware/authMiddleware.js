
// Middleware para proteger rotas DE ADMIN
export const requireAdmin = (req, res, next) => {
    if (req.session.NivelAcesso !== 'Total') {
        return res.status(403).redirect('/lobby');
    }
    next();
};

// Middleware para proteger rotas (login necessário)
export const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    next();
};
