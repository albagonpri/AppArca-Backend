const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const correo = process.argv[2] || 'admin@apparca.com';
  const contrasena = process.argv[3] || 'Admin1234!';

  let usuario = await prisma.usuario.findUnique({
    where: { correo },
  });

  if (usuario) {
    usuario = await prisma.usuario.update({
      where: { correo },
      data: { esAdmin: true },
    });
    console.log(`[Admin Seed] Usuario existente ${correo} promovido a Administrador.`);
  } else {
    const contrasenaHash = await bcrypt.hash(contrasena, 10);
    usuario = await prisma.usuario.create({
      data: {
        nombre: 'Administrador AppArca',
        correo,
        contrasenaHash,
        esAdmin: true,
      },
    });
    console.log(`[Admin Seed] Creado nuevo usuario administrador: ${correo} con contraseña: ${contrasena}`);
  }

  console.log(`[Admin Seed] ID: ${usuario.id} | Nombre: ${usuario.nombre} | Correo: ${usuario.correo} | esAdmin: ${usuario.esAdmin}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
