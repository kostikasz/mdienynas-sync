import { getPool } from "./pool.js";

export async function createUser({ email, passwordHash }) {
  const result = await getPool().query(
    "insert into users (email, password_hash) values ($1, $2) returning *",
    [email.toLowerCase(), passwordHash],
  );

  return result.rows[0];
}

export async function findUserByEmail(email) {
  const result = await getPool().query("select * from users where email = $1", [
    email.toLowerCase(),
  ]);

  return result.rows[0] || null;
}

export async function setUserConfirmation(userId, confirmed) {
  const result = await getPool().query(
    `update users
     set is_confirmed = $2,
         confirmed_at = case when $2 then now() else null end
     where id = $1
     returning *`,
    [userId, confirmed],
  );

  return result.rows[0] || null;
}

export async function updateUserPassword(userId, passwordHash) {
  const result = await getPool().query(
    `update users
     set password_hash = $2
     where id = $1
     returning *`,
    [userId, passwordHash],
  );

  return result.rows[0] || null;
}

export async function findUserById(userId) {
  const result = await getPool().query("select * from users where id = $1", [userId]);

  return result.rows[0] || null;
}

export async function listUsersForAdmin() {
  const result = await getPool().query(
    `select u.id, u.email, u.is_confirmed, u.confirmed_at, u.created_at,
            max(s.created_at) as latest_session_at
     from users u
     left join sessions s on s.user_id = u.id
     group by u.id
     order by u.created_at desc`,
  );

  return result.rows;
}
