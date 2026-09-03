/**
 * SAFE - the five packages the rule holds as reference, spelled correctly.
 * If any of these is reported the rule is accusing the very names it uses as
 * its own baseline.
 */
import express from 'express';
import axios from 'axios';
import lodash from 'lodash';

const app = express();

app.get('/users/:id', async (req, res) => {
  const { data } = await axios.get(`https://internal.example/users/${req.params.id}`);
  res.json(lodash.pick(data, ['id', 'name', 'email']));
});

export default app;
