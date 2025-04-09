-- CREATE POLICY "models_anon_allow_select" ON storage.objects FOR ALL TO anon USING (bucket_id = 'models');
-- CREATE POLICY "models_authenticated_allow_everything 1hcrz3e_0" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'models');

CREATE POLICY "allow_select" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'models');
CREATE POLICY "allow_all_authenticated" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'models');