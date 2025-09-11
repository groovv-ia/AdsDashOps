@@ .. @@
 ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
 
-CREATE POLICY "Users can view own profile"
-  ON profiles
-  FOR SELECT
-  TO authenticated
-  USING (auth.uid() = id);
-
-CREATE POLICY "Users can update own profile"
-  ON profiles
-  FOR UPDATE
-  TO authenticated
-  USING (auth.uid() = id)
-  WITH CHECK (auth.uid() = id);
-
-CREATE POLICY "Users can insert own profile"
-  ON profiles
-  FOR INSERT
-  TO authenticated
-  WITH CHECK (auth.uid() = id);
-
-CREATE POLICY "Users can delete own profile"
-  ON profiles
-  FOR DELETE
-  TO authenticated
-  USING (auth.uid() = id);
+-- Create RLS policies using RPC function to avoid conflicts
+SELECT create_policy_if_not_exists(
+  'profiles',
+  'Users can view own profile',
+  'FOR SELECT TO authenticated USING (auth.uid() = id)'
+);
+
+SELECT create_policy_if_not_exists(
+  'profiles',
+  'Users can update own profile',
+  'FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id)'
+);
+
+SELECT create_policy_if_not_exists(
+  'profiles',
+  'Users can insert own profile',
+  'FOR INSERT TO authenticated WITH CHECK (auth.uid() = id)'
+);
+
+SELECT create_policy_if_not_exists(
+  'profiles',
+  'Users can delete own profile',
+  'FOR DELETE TO authenticated USING (auth.uid() = id)'
+);