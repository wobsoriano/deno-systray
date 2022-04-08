export default {
  'icon': '',
  'title': 'Title',
  'tooltip': 'Tooltip',
  'items': [{
    'title': 'aa',
    'tooltip': 'bb',
    'checked': true,
    'enabled': true
  }, {
    'title': '<SEPARATOR>',
    'tooltip': '',
    'enabled': true
  }, {
    'title': 'aa2',
    'tooltip': 'bb',
    'checked': false,
    'enabled': true,
    'items': [{
      'title': 'submenu 1',
      'tooltip': 'this is submenu 1',
      'checked': true,
      'enabled': true
    }, {
      'title': 'submenu 2',
      'tooltip': 'this is submenu 2',
      'checked': true,
      'enabled': true
    }]
  }, {
    'title': 'Exit',
    'tooltip': 'bb',
    'checked': false,
    'enabled': true
  }]
}
