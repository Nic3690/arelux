DROP POLICY "allow_select" ON storage.objects;
DROP POLICY "allow_all_authenticated" ON storage.objects;
CREATE POLICY "allow_select" ON storage.objects FOR SELECT TO anon USING (true);
CREATE POLICY "allow_all_authenticated" ON storage.objects FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_select" ON storage.buckets FOR SELECT TO anon, authenticated USING (true);