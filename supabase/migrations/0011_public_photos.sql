-- 0011: photos on posts and jobs must open for everyone.
-- The app shows them through their public address. An earlier migration created the "job-photos" bucket as public,
-- but on a project where the bucket already existed it only updated the size and type limits and left it private:
-- uploads worked, and every photo then showed as an empty box. Make both picture buckets public for certain.
update storage.buckets set public = true where id in ('job-photos', 'avatars') and public is distinct from true;
