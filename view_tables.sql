SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('public', 'autocrm') ORDER BY schemaname, tablename;
