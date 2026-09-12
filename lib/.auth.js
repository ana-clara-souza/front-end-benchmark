const jwt = require("jsonwebtoken");

function getAuthenticatedUser(request) {
  try {
    const authorization = request.headers.get("authorization");
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = request.cookies?.get("access_token")?.value || bearerToken;

    if (!token)
      return { status: 401, body: { message: "Token não informado" } };

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { user: { id: decoded.id } };
  } catch {
    return { status: 401, body: { message: "Token inválido" } };
  }
}

module.exports = { getAuthenticatedUser };
