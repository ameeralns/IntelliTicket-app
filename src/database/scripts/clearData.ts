import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Please check your .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearData() {
  try {
    console.log('Starting database cleanup...');

    // Define tables in order of deletion (respecting foreign key constraints)
    const tablesToClear = [
      { name: 'custom_fields', idColumn: 'custom_field_id' },
      { name: 'ticket_tags', idColumn: null }, // junction table with composite key
      { name: 'interactions', idColumn: 'interaction_id' },
      { name: 'customer_feedback', idColumn: 'feedback_id' },
      { name: 'tickets', idColumn: 'ticket_id' },
      { name: 'agent_metrics', idColumn: 'metric_id' },
      { name: 'agent_skills', idColumn: 'skill_id' },
      { name: 'team_schedules', idColumn: 'schedule_id' },
      { name: 'email_templates', idColumn: 'template_id' },
      { name: 'response_templates', idColumn: 'template_id' },
      { name: 'knowledge_articles', idColumn: 'article_id' },
      { name: 'routing_rules', idColumn: 'rule_id' },
      { name: 'chatbot_configs', idColumn: 'config_id' },
      { name: 'tutorials', idColumn: 'tutorial_id' },
      { name: 'audit_logs', idColumn: 'log_id' },
      { name: 'system_settings', idColumn: 'setting_id' },
      { name: 'customers', idColumn: 'customer_id' },
      { name: 'agents', idColumn: 'agent_id' },
      { name: 'teams', idColumn: 'team_id' },
      { name: 'tags', idColumn: 'tag_id' },
      { name: 'organizations', idColumn: 'organization_id' }
    ];

    // First, get all users to delete from auth
    console.log('Fetching users to delete...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // Delete each user from auth
    console.log(`Found ${users.users.length} users to delete`);
    for (const user of users.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`Error deleting user ${user.id}:`, deleteError);
        throw deleteError;
      }
      console.log(`Deleted auth user: ${user.email}`);
    }

    // Clear each table
    for (const table of tablesToClear) {
      console.log(`Clearing table: ${table.name}`);
      
      if (table.idColumn === null) {
        // For junction tables with composite keys
        const { error } = await supabase
          .from(table.name)
          .delete()
          .gte('ticket_id', '00000000-0000-0000-0000-000000000000');
        
        if (error) {
          console.error(`Error clearing table ${table.name}:`, error);
          throw error;
        }
      } else {
        // For tables with single primary key
        const { error } = await supabase
          .from(table.name)
          .delete()
          .gte(table.idColumn, '00000000-0000-0000-0000-000000000000');
        
        if (error) {
          console.error(`Error clearing table ${table.name}:`, error);
          throw error;
        }
      }
      
      console.log(`Cleared table: ${table.name}`);
    }

    console.log('Database cleanup completed successfully!');
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
}

// Run the clear data function
clearData(); 