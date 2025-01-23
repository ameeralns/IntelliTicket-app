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

// Default password for test users
const DEFAULT_PASSWORD = 'Test@123456';

// Real-world company names and their respective teams
const organizationData = [
  {
    name: 'TechCare Solutions',
    description: 'Enterprise IT Support and Solutions',
    teams: ['Technical Support', 'Network Infrastructure', 'Cloud Services']
  },
  {
    name: 'HealthFirst Services',
    description: 'Healthcare Technology and Patient Support',
    teams: ['Patient Care', 'Medical Equipment', 'Healthcare IT']
  },
  {
    name: 'FinServ Direct',
    description: 'Financial Services Technology Support',
    teams: ['Banking Systems', 'Payment Processing', 'Security Operations']
  },
  {
    name: 'EduTech Support',
    description: 'Educational Technology Solutions',
    teams: ['Learning Platforms', 'Student Services', 'Faculty Support']
  },
  {
    name: 'RetailTech Solutions',
    description: 'Retail Technology and POS Support',
    teams: ['POS Systems', 'E-commerce Support', 'Inventory Systems']
  }
];

// Real agent names for each role
const agentNames = {
  'Senior Agent': [
    'Emma Thompson', 'James Wilson', 'Sarah Chen', 'Michael Rodriguez', 'Lisa Patel',
    'David Kim', 'Rachel O\'Connor', 'Thomas Anderson', 'Maria Garcia', 'John Smith'
  ],
  'Agent': [
    'Kevin Lee', 'Jennifer White', 'Carlos Mendoza', 'Amy Wong', 'Brian Taylor',
    'Diana Martinez', 'Steven Johnson', 'Michelle Park', 'Robert Brown', 'Laura Davis'
  ],
  'Junior Agent': [
    'Alex Rivera', 'Sophie Turner', 'Ryan Cooper', 'Hannah Kim', 'Marcus Green',
    'Olivia Chen', 'Chris Morgan', 'Jessica Lee', 'Daniel Nguyen', 'Emily Wilson'
  ]
};

// Real customer names
const customerNames = [
  'William Anderson', 'Isabella Martinez', 'Benjamin Lee', 'Sophia Patel', 'Lucas Thompson',
  'Ava Rodriguez', 'Ethan Taylor', 'Mia Garcia', 'Oliver Brown', 'Emma Davis',
  'Noah Wilson', 'Charlotte Chen', 'Liam Johnson', 'Amelia Kim', 'Mason White',
  'Harper Wong', 'Elijah Green', 'Abigail Morgan', 'Alexander Rivera', 'Elizabeth Turner'
];

// Knowledge base categories
const knowledgeBaseCategories = [
  'Getting Started', 'Account Management', 'Billing & Payments', 'Technical Issues',
  'Security', 'Best Practices', 'Product Features', 'Integrations', 'Troubleshooting',
  'FAQs'
];

// Agent skills with categories
const agentSkills = {
  technical: [
    { name: 'Network Infrastructure', levels: [3, 4, 5] },
    { name: 'Database Management', levels: [3, 4, 5] },
    { name: 'Cloud Services', levels: [3, 4, 5] },
    { name: 'Security', levels: [3, 4, 5] },
    { name: 'System Administration', levels: [3, 4, 5] }
  ],
  soft: [
    { name: 'Customer Communication', levels: [3, 4, 5] },
    { name: 'Problem Solving', levels: [3, 4, 5] },
    { name: 'Time Management', levels: [3, 4, 5] },
    { name: 'Team Collaboration', levels: [3, 4, 5] },
    { name: 'Conflict Resolution', levels: [3, 4, 5] }
  ],
  product: [
    { name: 'Product Knowledge', levels: [3, 4, 5] },
    { name: 'Feature Expertise', levels: [3, 4, 5] },
    { name: 'Integration Knowledge', levels: [3, 4, 5] },
    { name: 'Troubleshooting', levels: [3, 4, 5] },
    { name: 'Best Practices', levels: [3, 4, 5] }
  ]
};

// Define type for agent roles
type AgentRole = 'Senior Agent' | 'Agent' | 'Junior Agent';

// Response templates
const responseTemplates = [
  {
    name: 'Account Access Reset',
    content: 'I understand you\'re having trouble accessing your account. I\'ve reset your access. Please try logging in again with your email address. You should receive a password reset link shortly.',
    category: 'Account Management',
    is_macro: false
  },
  {
    name: 'Technical Issue Acknowledgment',
    content: 'I understand you\'re experiencing {issue}. I\'ll help you resolve this. First, could you please confirm if you have tried {troubleshooting_step}?',
    category: 'Technical Support',
    is_macro: false
  },
  {
    name: 'Escalation Notice',
    content: 'I\'ve reviewed your case and I\'ll need to escalate this to our specialized team for further assistance. They\'ll be notified immediately and will prioritize your case.',
    category: 'Escalation',
    is_macro: true,
    shortcut: '/esc'
  }
];

// Routing rules
const routingRules = [
  {
    name: 'High Priority Technical Issues',
    conditions: {
      priority: 'High',
      category: 'Technical',
      required_skills: ['Technical Support', 'Troubleshooting']
    },
    actions: {
      assign_team: 'Technical Support',
      minimum_skill_level: 4,
      priority: 'High'
    },
    priority: 1
  },
  {
    name: 'VIP Customer Route',
    conditions: {
      customer_type: 'VIP',
      business_hours: true
    },
    actions: {
      assign_team: 'Senior Support',
      minimum_skill_level: 5,
      priority: 'High'
    },
    priority: 2
  }
];

// Team schedules
const teamSchedules = [
  {
    day_of_week: 1, // Monday
    start_time: '09:00',
    end_time: '17:00',
    timezone: 'UTC'
  },
  {
    day_of_week: 2, // Tuesday
    start_time: '09:00',
    end_time: '17:00',
    timezone: 'UTC'
  }
];

// Chatbot configurations
const chatbotConfigs = {
  name: 'Support Assistant',
  configuration: {
    welcome_message: 'Hello! How can I assist you today?',
    fallback_message: 'I apologize, but I need more information to help you. Would you like to speak with a human agent?',
    max_retries: 3,
    handoff_threshold: 0.7,
    enabled_features: ['quick_replies', 'button_responses', 'handoff'],
    response_templates: {
      greeting: ['Hi there!', 'Hello!', 'Welcome!'],
      farewell: ['Goodbye!', 'Have a great day!', 'Thank you for using our service!'],
      handoff: ['Let me connect you with an agent.', 'I\'ll transfer you to a human agent.']
    }
  }
};

// Tutorial content
const tutorials = [
  {
    title: 'Getting Started Guide',
    content: 'Welcome to our platform! This guide will help you get started with the basic features.',
    steps: [
      { step: 1, title: 'Account Setup', content: 'Create your account and verify your email.' },
      { step: 2, title: 'Profile Configuration', content: 'Set up your profile and preferences.' },
      { step: 3, title: 'First Steps', content: 'Learn how to navigate the dashboard.' }
    ],
    category: 'Onboarding',
    difficulty_level: 'Beginner'
  },
  {
    title: 'Advanced Features Guide',
    content: 'Master the advanced features of our platform.',
    steps: [
      { step: 1, title: 'Advanced Settings', content: 'Configure advanced settings for your account.' },
      { step: 2, title: 'Custom Workflows', content: 'Create and manage custom workflows.' },
      { step: 3, title: 'Automation Rules', content: 'Set up automation rules for your tasks.' }
    ],
    category: 'Advanced',
    difficulty_level: 'Advanced'
  }
];

// Add new functions for missing tables
async function createTickets(organizationId: string, customers: any[], agents: any[], teams: any[], tags: any[]) {
  const statuses = ['New', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];
  const tickets = [];

  // Create 3-5 tickets for each customer
  for (const customer of customers) {
    const numTickets = Math.floor(Math.random() * 3) + 3; // 3-5 tickets
    
    for (let i = 0; i < numTickets; i++) {
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const team = teams[Math.floor(Math.random() * teams.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];

      const ticket = {
        customer_id: customer.customer_id,
        agent_id: status !== 'New' ? agent.agent_id : null,
        team_id: status !== 'New' ? team.team_id : null,
        organization_id: organizationId,
        title: `Issue with ${['login', 'performance', 'feature', 'error', 'configuration'][Math.floor(Math.random() * 5)]}`,
        description: `Detailed description of the issue that needs to be resolved. This is ticket ${i + 1} for customer ${customer.name}.`,
        status: status,
        priority: priority,
        satisfaction_score: status === 'Closed' ? Math.floor(Math.random() * 5) + 1 : null
      };

      tickets.push(ticket);
    }
  }

  const { data: createdTickets, error } = await supabase
    .from('tickets')
    .insert(tickets)
    .select();

  if (error) throw error;
  console.log(`Created ${tickets.length} tickets`);

  // Create ticket tags
  await createTicketTags(createdTickets, tags);
  
  // Create interactions for each ticket
  await createInteractions(createdTickets, agents, customers);
  
  // Create custom fields for some tickets
  await createCustomFields(createdTickets);
  
  // Create customer feedback for closed tickets
  await createCustomerFeedback(createdTickets.filter(t => t.status === 'Closed'));

  return createdTickets;
}

async function createTicketTags(tickets: any[], tags: any[]) {
  const ticketTags = [];
  
  for (const ticket of tickets) {
    // Assign 1-3 random tags to each ticket
    const numTags = Math.floor(Math.random() * 3) + 1;
    const ticketTagIds = new Set();
    
    while (ticketTagIds.size < numTags) {
      const tag = tags[Math.floor(Math.random() * tags.length)];
      ticketTagIds.add(tag.tag_id);
    }
    
    for (const tagId of ticketTagIds) {
      ticketTags.push({
        ticket_id: ticket.ticket_id,
        tag_id: tagId
      });
    }
  }

  const { error } = await supabase
    .from('ticket_tags')
    .insert(ticketTags);

  if (error) throw error;
  console.log(`Created ${ticketTags.length} ticket tags`);
}

async function createInteractions(tickets: any[], agents: any[], customers: any[]) {
  const interactions = [];
  const types = ['Email', 'Chat', 'Phone', 'Note'];

  for (const ticket of tickets) {
    // Create 2-5 interactions per ticket
    const numInteractions = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < numInteractions; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const isCustomer = Math.random() > 0.5;
      
      interactions.push({
        ticket_id: ticket.ticket_id,
        agent_id: isCustomer ? null : ticket.agent_id,
        customer_id: isCustomer ? ticket.customer_id : null,
        content: `${type} interaction content for ticket. This is interaction ${i + 1}.`,
        interaction_type: type,
        is_private: type === 'Note'
      });
    }
  }

  const { error } = await supabase
    .from('interactions')
    .insert(interactions);

  if (error) throw error;
  console.log(`Created ${interactions.length} interactions`);
}

async function createCustomFields(tickets: any[]) {
  const customFields = [];
  const fieldNames = ['browser', 'os', 'device', 'impact', 'department'];
  
  for (const ticket of tickets) {
    // Add 1-3 custom fields to 60% of tickets
    if (Math.random() > 0.4) {
      const numFields = Math.floor(Math.random() * 3) + 1;
      const usedFields = new Set();
      
      for (let i = 0; i < numFields; i++) {
        const fieldName = fieldNames[Math.floor(Math.random() * fieldNames.length)];
        if (!usedFields.has(fieldName)) {
          usedFields.add(fieldName);
          customFields.push({
            ticket_id: ticket.ticket_id,
            field_name: fieldName,
            field_value: `Value for ${fieldName}`
          });
        }
      }
    }
  }

  const { error } = await supabase
    .from('custom_fields')
    .insert(customFields);

  if (error) throw error;
  console.log(`Created ${customFields.length} custom fields`);
}

async function createCustomerFeedback(closedTickets: any[]) {
  const feedback = closedTickets.map(ticket => ({
    ticket_id: ticket.ticket_id,
    customer_id: ticket.customer_id,
    rating: ticket.satisfaction_score,
    comment: ticket.satisfaction_score >= 4 
      ? 'Great service, thank you!'
      : ticket.satisfaction_score <= 2
        ? 'Service could be improved.'
        : 'Service was okay.'
  }));

  const { error } = await supabase
    .from('customer_feedback')
    .insert(feedback);

  if (error) throw error;
  console.log(`Created ${feedback.length} customer feedback entries`);
}

async function createAgentMetrics(agents: any[]) {
  const metrics = [];
  const metricTypes = [
    'tickets_resolved',
    'average_response_time',
    'customer_satisfaction',
    'first_response_time',
    'resolution_time'
  ];

  for (const agent of agents) {
    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - 1);
    const periodEnd = new Date();

    // Create metrics for each type
    for (const metricType of metricTypes) {
      metrics.push({
        agent_id: agent.agent_id,
        metric_type: metricType,
        metric_value: Math.random() * 100,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString()
      });
    }
  }

  const { error } = await supabase
    .from('agent_metrics')
    .insert(metrics);

  if (error) throw error;
  console.log(`Created ${metrics.length} agent metrics`);
}

async function createAuditLogs(organizationId: string, entities: any[]) {
  const logs = [];
  const actionTypes = ['create', 'update', 'delete'];
  const entityTypes = ['ticket', 'customer', 'agent', 'team'];

  for (const entity of entities) {
    const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
    
    // Ensure we have a valid actor_id
    const actorId = entity.agent_id || entity.customer_id;
    if (!actorId) continue; // Skip if we don't have a valid actor

    logs.push({
      organization_id: organizationId,
      actor_id: actorId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entity.ticket_id || entity.customer_id || entity.agent_id || entity.team_id,
      changes: {
        before: {},
        after: {}
      }
    });
  }

  if (logs.length === 0) return; // Skip if no valid logs

  const { error } = await supabase
    .from('audit_logs')
    .insert(logs);

  if (error) throw error;
  console.log(`Created ${logs.length} audit logs`);
}

async function seedData() {
  try {
    console.log('Starting data seeding...');

    // Create tags first (they don't have dependencies)
    const createdTags = await createTags();
    console.log('Created tags:', createdTags.length);

    // Create organizations and their hierarchy
    for (const org of organizationData) {
      // Create organization
      const { data: organization } = await supabase
        .from('organizations')
        .insert({
          name: org.name,
          description: org.description
        })
        .select()
        .single();

      if (!organization) throw new Error(`Failed to create organization ${org.name}`);
      console.log(`Created organization: ${org.name}`);

      // Create chatbot config for organization
      await createChatbotConfig(organization.organization_id);

      // Create tutorials for organization
      await createTutorials(organization.organization_id);

      // Create routing rules for organization
      await createRoutingRules(organization.organization_id);

      // Create response templates for organization
      await createResponseTemplates(organization.organization_id);

      // Create admin for the organization
      await createOrganizationAdmin(organization.organization_id, org.name);

      const createdTeams = [];
      const createdAgents = [];

      // Create teams for the organization
      for (const teamName of org.teams) {
        const { data: team } = await supabase
          .from('teams')
          .insert({
            organization_id: organization.organization_id,
            name: teamName,
            description: `${teamName} team for ${org.name}`
          })
          .select()
          .single();

        if (!team) throw new Error(`Failed to create team ${teamName}`);
        console.log(`Created team: ${teamName}`);
        createdTeams.push(team);

        // Create team schedules
        await createTeamSchedules(team.team_id);

        // Create agents for each team
        const teamAgents = await createAgentsForTeam(organization.organization_id, team.team_id, teamName);
        createdAgents.push(...teamAgents);
      }

      // Create knowledge base articles
      await createKnowledgeArticles(organization.organization_id);

      // Create email templates for the organization
      await createEmailTemplates(organization.organization_id);

      // Create customers for the organization
      const createdCustomers = await createCustomersForOrganization(organization.organization_id, org.name);

      // Create tickets and related data
      const createdTickets = await createTickets(
        organization.organization_id,
        createdCustomers,
        createdAgents,
        createdTeams,
        createdTags
      );

      // Create agent metrics
      await createAgentMetrics(createdAgents);

      // Create audit logs
      await createAuditLogs(
        organization.organization_id,
        [...createdTickets, ...createdCustomers, ...createdAgents, ...createdTeams]
      );
    }

    console.log('Data seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
}

// Implementation of new seeding functions
async function createChatbotConfig(organizationId: string) {
  const config = {
    ...chatbotConfigs,
    organization_id: organizationId
  };

  const { data, error } = await supabase
    .from('chatbot_configs')
    .insert([config])
    .select();

  if (error) throw error;
  console.log('Created chatbot config');
  return data;
}

async function createTutorials(organizationId: string) {
  const tutorialsWithOrg = tutorials.map(tutorial => ({
    ...tutorial,
    organization_id: organizationId
  }));

  const { data, error } = await supabase
    .from('tutorials')
    .insert(tutorialsWithOrg)
    .select();

  if (error) throw error;
  console.log('Created tutorials');
  return data;
}

async function createRoutingRules(organizationId: string) {
  const rulesWithOrg = routingRules.map(rule => ({
    ...rule,
    organization_id: organizationId,
    conditions: JSON.stringify(rule.conditions),
    actions: JSON.stringify(rule.actions)
  }));

  const { data, error } = await supabase
    .from('routing_rules')
    .insert(rulesWithOrg)
    .select();

  if (error) throw error;
  console.log('Created routing rules');
  return data;
}

async function createResponseTemplates(organizationId: string) {
  const templatesWithOrg = responseTemplates.map(template => ({
    ...template,
    organization_id: organizationId
  }));

  const { data, error } = await supabase
    .from('response_templates')
    .insert(templatesWithOrg)
    .select();

  if (error) throw error;
  console.log('Created response templates');
  return data;
}

async function createTeamSchedules(teamId: string) {
  const schedulesWithTeam = teamSchedules.map(schedule => ({
    ...schedule,
    team_id: teamId
  }));

  const { data, error } = await supabase
    .from('team_schedules')
    .insert(schedulesWithTeam)
    .select();

  if (error) throw error;
  console.log('Created team schedules');
  return data;
}

async function createKnowledgeArticles(organizationId: string) {
  const articles = knowledgeBaseCategories.map(category => ({
    organization_id: organizationId,
    title: `Guide to ${category}`,
    content: `Comprehensive guide about ${category} and its best practices.`,
    category: category,
    tags: [category.toLowerCase(), 'guide', 'help'],
    is_published: true
  }));

  const { data, error } = await supabase
    .from('knowledge_articles')
    .insert(articles)
    .select();

  if (error) throw error;
  console.log('Created knowledge articles');
  return data;
}

async function createAgentSkills(agentId: string) {
  const skills = [];
  
  // Add technical skills
  for (const skill of agentSkills.technical) {
    skills.push({
      agent_id: agentId,
      skill_name: skill.name,
      proficiency_level: skill.levels[Math.floor(Math.random() * skill.levels.length)]
    });
  }

  // Add soft skills
  for (const skill of agentSkills.soft) {
    skills.push({
      agent_id: agentId,
      skill_name: skill.name,
      proficiency_level: skill.levels[Math.floor(Math.random() * skill.levels.length)]
    });
  }

  const { data, error } = await supabase
    .from('agent_skills')
    .insert(skills)
    .select();

  if (error) throw error;
  console.log('Created agent skills');
  return data;
}

// Modify existing functions to use real names
async function createAgentsForTeam(organizationId: string, teamId: string, teamName: string) {
  const agentRoles: AgentRole[] = ['Senior Agent', 'Agent', 'Junior Agent'];
  const createdAgents = [];
  
  for (const role of agentRoles) {
    const randomNameIndex = Math.floor(Math.random() * agentNames[role].length);
    const name = agentNames[role][randomNameIndex];
    const email = `${name.toLowerCase().replace(' ', '.')}@${teamName.toLowerCase().replace(' ', '.')}example.com`;

    // Create auth user first
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'agent',
        organization_id: organizationId,
        display_name: name
      }
    });

    if (authError) throw new Error(`Failed to create auth user for agent ${name}: ${authError.message}`);
    if (!authUser.user) throw new Error(`Failed to create auth user for agent ${name}`);

    console.log(`Created auth user for agent: ${name}`);

    // Create agent record
    const { data: agent } = await supabase
      .from('agents')
      .insert({
        agent_id: authUser.user.id,
        organization_id: organizationId,
        team_id: teamId,
        name: name,
        email: email,
        role: role
      })
      .select()
      .single();

    if (!agent) throw new Error(`Failed to create agent for team ${teamName}`);
    
    // Create agent skills
    await createAgentSkills(agent.agent_id);
    
    console.log(`Created agent: ${agent.name}`);
    createdAgents.push(agent);
  }

  return createdAgents;
}

async function createCustomersForOrganization(organizationId: string, orgName: string) {
  const usedNameIndexes = new Set();
  const createdCustomers = [];

  for (let i = 0; i < 5; i++) {
    let randomNameIndex;
    do {
      randomNameIndex = Math.floor(Math.random() * customerNames.length);
    } while (usedNameIndexes.has(randomNameIndex));
    
    usedNameIndexes.add(randomNameIndex);
    const name = customerNames[randomNameIndex];
    const email = `${name.toLowerCase().replace(' ', '.')}@${orgName.toLowerCase().replace(' ', '.')}customer.com`;
    const phone = `+1${Math.floor(Math.random() * 900 + 100)}${Math.floor(Math.random() * 900 + 100)}${Math.floor(Math.random() * 9000 + 1000)}`;

    // Create auth user first
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'customer',
        organization_id: organizationId,
        display_name: name
      }
    });

    if (authError) throw new Error(`Failed to create auth user for customer ${name}: ${authError.message}`);
    if (!authUser.user) throw new Error(`Failed to create auth user for customer ${name}`);

    console.log(`Created auth user for customer: ${name}`);

    // Create customer record
    const { data: customer } = await supabase
      .from('customers')
      .insert({
        customer_id: authUser.user.id,
        organization_id: organizationId,
        name: name,
        email: email,
        phone: phone,
        contact_preferences: { email: true, phone: true },
        notification_settings: { ticket_updates: true, marketing: false }
      })
      .select()
      .single();

    if (!customer) throw new Error(`Failed to create customer for organization ${orgName}`);
    console.log(`Created customer: ${customer.name}`);
    createdCustomers.push(customer);
  }

  return createdCustomers;
}

// Add missing functions
async function createTags() {
  const tags = [
    { name: 'urgent' },
    { name: 'bug' },
    { name: 'feature-request' },
    { name: 'enhancement' },
    { name: 'documentation' },
    { name: 'question' },
    { name: 'security' },
    { name: 'performance' },
    { name: 'ui-ux' },
    { name: 'testing' }
  ];

  const { data, error } = await supabase
    .from('tags')
    .insert(tags)
    .select();

  if (error) throw error;
  return data || [];
}

async function createOrganizationAdmin(organizationId: string, orgName: string) {
  const adminName = `${orgName} Admin`;
  const email = `admin@${orgName.toLowerCase().replace(' ', '.')}example.com`;

  // Create auth user first
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: {
      name: adminName,
      role: 'admin',
      organization_id: organizationId,
      display_name: adminName
    }
  });

  if (authError) throw new Error(`Failed to create auth user for admin ${adminName}: ${authError.message}`);
  if (!authUser.user) throw new Error(`Failed to create auth user for admin ${adminName}`);

  // Create admin as an agent with admin role
  const { data: admin, error: adminError } = await supabase
    .from('agents')
    .insert({
      agent_id: authUser.user.id,
      organization_id: organizationId,
      name: adminName,
      email: email,
      role: 'admin'
    })
    .select()
    .single();

  if (adminError) throw adminError;
  console.log(`Created admin: ${adminName}`);
  return admin;
}

async function createEmailTemplates(organizationId: string) {
  const templates = [
    {
      name: 'Welcome Email',
      subject: 'Welcome to Our Support Platform',
      body: 'Dear {customer_name},\n\nWelcome to our support platform! We\'re excited to have you on board.',
      organization_id: organizationId,
      variables: { customer_name: 'string' },
      is_active: true
    },
    {
      name: 'Ticket Created',
      subject: 'Your Support Ticket #{ticket_id} Has Been Created',
      body: 'Dear {customer_name},\n\nYour support ticket has been created and our team will assist you shortly.',
      organization_id: organizationId,
      variables: { customer_name: 'string', ticket_id: 'string' },
      is_active: true
    },
    {
      name: 'Ticket Resolved',
      subject: 'Your Support Ticket #{ticket_id} Has Been Resolved',
      body: 'Dear {customer_name},\n\nYour support ticket has been resolved. Please let us know if you need further assistance.',
      organization_id: organizationId,
      variables: { customer_name: 'string', ticket_id: 'string' },
      is_active: true
    }
  ];

  const { data, error } = await supabase
    .from('email_templates')
    .insert(templates)
    .select();

  if (error) throw error;
  console.log('Created email templates');
  return data;
}

// Run the seed data function
seedData(); 