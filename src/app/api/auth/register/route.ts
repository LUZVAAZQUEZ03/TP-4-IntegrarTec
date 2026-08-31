import { hash } from "bcrypt";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

type RegisterBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

function getRegistrationData(body: RegisterBody) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 2 || name.length > 80) {
    return { error: "El nombre debe tener entre 2 y 80 caracteres." };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { error: "El email no es válido." };
  }

  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return {
      error: `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`,
    };
  }

  return { name, email, password };
}

export async function POST(request: Request) {
  let body: RegisterBody;

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "El cuerpo debe ser JSON válido." }, { status: 400 });
  }

  const registrationData = getRegistrationData(body);

  if ("error" in registrationData) {
    return Response.json({ message: registrationData.error }, { status: 400 });
  }

  try {
    const passwordHash = await hash(registrationData.password, 12);
    const user = await prisma.user.create({
      data: {
        name: registrationData.name,
        email: registrationData.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json({ message: "El email ya está registrado." }, { status: 409 });
    }

    return Response.json({ message: "No fue posible registrar el usuario." }, { status: 500 });
  }
}
