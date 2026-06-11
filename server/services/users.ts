import { password } from "bun";
import * as usersRepo from "../repositories/users";

export async function getUserByUsername(username: string) {
  return usersRepo.getUserByUsername(username);
}

export async function getUserById(id: number) {
  return usersRepo.getUserById(id);
}

export async function getUsers() {
  return usersRepo.getUsers();
}

export async function createUser(username: string, pw: string, role: "admin" | "user" = "user") {
  const hash = await password.hash(pw, { algorithm: "argon2id" });

  const deleted = await usersRepo.getDeletedUserByUsername(username);
  if (deleted) {
    await usersRepo.reviveUser(deleted.id, hash, role);
    return usersRepo.getUserById(deleted.id)!;
  }

  await usersRepo.insertUser({ username, password_hash: hash, role });
  const user = await usersRepo.getUserByUsername(username);
  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function deleteUser(id: number) {
  await usersRepo.deleteUser(id);
}

export async function updateUserPassword(id: number, newPassword: string) {
  const hash = await password.hash(newPassword, { algorithm: "argon2id" });
  await usersRepo.updateUserPassword(id, hash);
}

export async function hasAnyUser() {
  return usersRepo.hasAnyUser();
}

export async function createAdminUser(passwordHash: string) {
  return usersRepo.insertAdminUser(passwordHash);
}
