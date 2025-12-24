const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data: convs, error: convError } = await supabase.from('conversations').select('*').limit(1);
  console.log('Conversations:', { data: convs, error: convError });

  const { data: msgs, error: msgError } = await supabase.from('messages').select('*').limit(1);
  console.log('Messages:', { data: msgs, error: msgError });
}

test();
