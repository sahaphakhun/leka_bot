import { memo } from "react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Shield, User } from "lucide-react";

const MemberCard = memo(({ member }) => {
  const memberName = member.displayName || member.name || "ไม่ระบุชื่อ";

  const getRoleBadge = (role) => {
    if (role === "admin") {
      return (
        <Badge className="bg-purple-100 text-purple-800">
          <Shield className="w-3 h-3 mr-1" />
          ผู้ดูแล
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <User className="w-3 h-3 mr-1" />
        สมาชิก
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={member.avatar} />
                <AvatarFallback>{memberName.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h3 className="font-semibold">{memberName}</h3>
              {getRoleBadge(member.role)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t text-center">
          <div>
            <p className="text-xs text-gray-500">งานที่ได้รับ</p>
            <p className="text-lg font-semibold">{member.totalTasks || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">เสร็จสิ้น</p>
            <p className="text-lg font-semibold text-green-600">
              {member.completedTasks || 0}
            </p>
          </div>
        </div>

        {member.joinedAt && (
          <div className="mt-3 pt-3 border-t text-xs text-gray-500">
            เข้าร่วมเมื่อ: {new Date(member.joinedAt).toLocaleDateString("th-TH")}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

MemberCard.displayName = "MemberCard";

export default MemberCard;
