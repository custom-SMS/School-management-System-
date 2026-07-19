const { getAdminStats } = require('./controllers/statsController');

async function test() {
  const req = {
    branchFilter: {},
    user: { _id: 'test' }
  };
  const res = {
    status: function(code) {
      console.log('Status Code:', code);
      return this;
    },
    json: function(data) {
      console.log('JSON Data:', JSON.stringify(data, null, 2));
      return this;
    }
  };

  try {
    await getAdminStats(req, res);
  } catch (err) {
    console.error('Error during execution:', err);
  }
}

test();
