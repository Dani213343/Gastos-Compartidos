const GroupRepository = require('../../../domain/groups/GroupRepository');
const GroupModel = require('../../../models/Group');

class GroupMongoRepository extends GroupRepository {
  async findMembershipById(groupId) {
    // Solo traemos lo que necesitamos para permisos
    return GroupModel
      .findById(groupId)
      .select('members owner admins currency');
  }
}

module.exports = GroupMongoRepository;
