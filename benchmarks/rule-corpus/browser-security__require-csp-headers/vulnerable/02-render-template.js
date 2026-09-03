/** VULNERABLE - a template engine renders the document. The markup is in a
 *  .ejs file this rule will never see, which is exactly why the render call
 *  has to be the trigger. */
app.get('/profile', (req, res) => {
  res.render('profile', { user: req.user });
});
